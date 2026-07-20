const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const { authenticateToken } = require("../middleware/auth");
const swiftEngine = require("../engine/swiftEngine");
const auditEngine = require("../engine/auditEngine");

// ======================================
// SWIFT MESSAGE ROUTES
// Generate and retrieve SWIFT payment messages for settled trades.
// ======================================

// POST /generate — Generate SWIFT message(s) for a settled trade
router.post("/generate", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.body;
    const userId = req.user.userId;

    if (!tradeRef) {
      return res.status(400).json({ success: false, error: "tradeRef is required" });
    }

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) {
      return res.status(404).json({ success: false, error: "Trade not found or not assigned to you" });
    }

    if (trade.currentStatus !== "SETTLED") {
      return res.status(400).json({
        success: false,
        error: "SWIFT can only be generated for settled trades. Current status: " + trade.currentStatus
      });
    }

    const result = await swiftEngine.generateSwiftForTrade(trade, userId);

    if (!result.alreadyGenerated) {
      await auditEngine.recordEvent(
        tradeRef, userId, "SWIFT_GENERATED",
        `SWIFT ${result.messages.map(m => m.messageType).join(" + ")} generated. Settlement Ref: ${result.settlementRef}, SSI Ref: ${result.ssiRef}`
      );
    }

    return res.json({
      success: true,
      messages: result.messages,
      settlementRef: result.settlementRef,
      ssiRef: result.ssiRef,
      alreadyGenerated: result.alreadyGenerated
    });
  } catch (err) {
    console.error("[SWIFT] Generate error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /:tradeRef — Fetch generated SWIFT messages for a trade
router.get("/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;

    const messages = await swiftEngine.getSwiftMessages(tradeRef);

    if (!messages || messages.length === 0) {
      return res.json({
        success: true,
        messages: [],
        generated: false
      });
    }

    // Also fetch trade for settlement ref / ssi ref
    const trade = await Trade.findOne({ tradeRef }).lean();

    return res.json({
      success: true,
      messages,
      generated: true,
      settlementRef: trade?.settlementRef || messages[0]?.settlementRef,
      ssiRef: trade?.ssiReference || messages[0]?.ssiRef,
      direction: trade?.direction,
      counterpartyType: messages[0]?.counterpartyType
    });
  } catch (err) {
    console.error("[SWIFT] Fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
