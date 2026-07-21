// ======================================
// SWIFT MESSAGE API ROUTES
// Exposes SWIFT generation and retrieval endpoints.
//
// POST /api/swift/generate      — Generate SWIFT for a settled trade
// GET  /api/swift/trade/:ref    — Get all SWIFT messages for a trade
// GET  /api/swift/message/:id   — Get a single SWIFT message
// POST /api/swift/regenerate    — Regenerate SWIFT for a trade
// GET  /api/swift/preview/:ref  — Preview SWIFT without persisting
// ======================================

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const swift = require("../engine/swift");
const Trade = require("../models/Trade");

// ======================================
// POST /generate — Generate SWIFT for a settled trade
// ======================================
router.post("/generate", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.body;
    const userId = req.user.userId;

    if (!tradeRef) {
      return res.status(400).json({ success: false, error: "tradeRef is required" });
    }

    const result = await swift.generateSwiftMessages(tradeRef, userId);
    return res.json(result);
  } catch (err) {
    console.error("[SWIFT Route] Generate error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /trade/:tradeRef — Get all SWIFT messages for a trade
// ======================================
router.get("/trade/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;
    const messages = await swift.getMessagesForTrade(tradeRef);

    // Build display versions for each message
    const enriched = messages.map(msg => {
      let displayPayload = "";
      try {
        const SwiftRenderer = require("../engine/swift/renderers/SwiftRenderer");
        displayPayload = SwiftRenderer.renderDisplay(
          msg.messageType,
          msg.fieldMap || {},
          msg.senderBIC,
          msg.receiverBIC
        );
      } catch (e) {
        displayPayload = msg.messagePayload || "";
      }

      return {
        ...msg,
        displayPayload,
        messageTitle: getMessageTitle(msg.messageType)
      };
    });

    return res.json({
      success: true,
      tradeRef,
      messages: enriched,
      count: enriched.length
    });
  } catch (err) {
    console.error("[SWIFT Route] Get trade messages error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /message/:id — Get a single SWIFT message by ID
// ======================================
router.get("/message/:id", authenticateToken, async (req, res) => {
  try {
    const msg = await swift.getMessageById(req.params.id);
    if (!msg) {
      return res.status(404).json({ success: false, error: "SWIFT message not found" });
    }

    // Build display version
    let displayPayload = "";
    try {
      const SwiftRenderer = require("../engine/swift/renderers/SwiftRenderer");
      displayPayload = SwiftRenderer.renderDisplay(
        msg.messageType,
        msg.fieldMap || {},
        msg.senderBIC,
        msg.receiverBIC
      );
    } catch (e) {
      displayPayload = msg.messagePayload || "";
    }

    return res.json({
      success: true,
      message: {
        ...msg,
        displayPayload,
        messageTitle: getMessageTitle(msg.messageType)
      }
    });
  } catch (err) {
    console.error("[SWIFT Route] Get message error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// POST /regenerate — Regenerate SWIFT for a trade
// ======================================
router.post("/regenerate", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.body;
    const userId = req.user.userId;

    if (!tradeRef) {
      return res.status(400).json({ success: false, error: "tradeRef is required" });
    }

    const result = await swift.regenerateSwiftMessages(tradeRef, userId);
    return res.json(result);
  } catch (err) {
    console.error("[SWIFT Route] Regenerate error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /preview/:tradeRef — Preview SWIFT without persisting
// ======================================
router.get("/preview/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;

    // Load trade
    const trade = await Trade.findOne({ tradeRef }).lean();
    if (!trade) {
      return res.status(404).json({ success: false, error: "Trade not found" });
    }

    if (trade.currentStatus !== "SETTLED") {
      return res.status(400).json({
        success: false,
        error: `SWIFT preview is only available for SETTLED trades. Current status: ${trade.currentStatus}`
      });
    }

    // Load dependencies
    const ourBank = await swift.SwiftEngine.loadOurBank(trade.entity, trade.currency);
    const counterpartySSI = await swift.SwiftEngine.loadCounterpartySSI(trade);

    if (!ourBank || !counterpartySSI) {
      return res.status(400).json({
        success: false,
        error: "Cannot load entity or counterparty SSI data for preview"
      });
    }

    // Build instruction and preview
    const PaymentInstruction = require("../engine/swift/PaymentInstruction");
    const SwiftFactory = require("../engine/swift/SwiftFactory");
    const SwiftRenderer = require("../engine/swift/renderers/SwiftRenderer");
    const SwiftValidator = require("../engine/swift/validators/SwiftValidator");

    const instruction = PaymentInstruction.build(trade, ourBank, counterpartySSI);
    const messageSpecs = SwiftFactory.create(instruction);

    const previews = messageSpecs.map(spec => {
      const validation = SwiftValidator.validate(instruction, spec.messageType);
      const rawPayload = SwiftRenderer.render(
        spec.messageType, spec.fieldMap,
        instruction.senderBIC, instruction.receiverBIC
      );
      const displayPayload = SwiftRenderer.renderDisplay(
        spec.messageType, spec.fieldMap,
        instruction.senderBIC, instruction.receiverBIC
      );

      return {
        messageType: spec.messageType,
        messageTitle: getMessageTitle(spec.messageType),
        rawPayload,
        displayPayload,
        fieldMap: spec.fieldMap,
        validation,
        senderBIC: instruction.senderBIC,
        receiverBIC: instruction.receiverBIC,
        paymentDirection: instruction.paymentDirection
      };
    });

    return res.json({
      success: true,
      tradeRef,
      direction: trade.direction,
      paymentDirection: instruction.paymentDirection,
      entity: trade.entity,
      counterparty: trade.counterpartyGroup || trade.counterparty,
      previews
    });
  } catch (err) {
    console.error("[SWIFT Route] Preview error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================
// HELPERS
// ============================

function getMessageTitle(messageType) {
  switch (messageType) {
    case "MT103": return "Single Customer Credit Transfer";
    case "MT202": return "General Financial Institution Transfer";
    case "MT202COV": return "Cover Payment";
    default: return "SWIFT Message";
  }
}

module.exports = router;
