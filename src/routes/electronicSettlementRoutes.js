const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const auditEngine = require("../engine/auditEngine");
const { authenticateToken } = require("../middleware/auth");
const LifecycleEngine = require("../engine/lifecycle");
const systemWorkflowEngine = require("../engine/systemWorkflowEngine");

// ======================================
// ELECTRONIC SETTLEMENT PAGE ROUTES
// Serves the STCC Electronic Settlement UI with:
//   - ALL electronic trades in DB (not just assigned to user)
//   - User can only ACT on trades assigned to them
//   - MATCHED/UNMATCHED based on ACTUAL DISCREPANCY (not status)
//   - Settle (direct), Edit+Amend (direct, no system mail), and Truth lookup
// ======================================

// Statuses that indicate the trade is being processed by the system
const PENDING_STATUSES = ["PENDING_AMENDMENT", "AMENDED", "PENDING_APPROVAL"];
const SETTLED_STATUSES = ["SETTLED"];

/**
 * Classify a trade's electronic status based on ACTUAL DISCREPANCY
 * between trade values and truth values — NOT based on currentStatus.
 *
 * - SETTLED:   currentStatus is SETTLED
 * - PENDING:   trade is being processed (PENDING_AMENDMENT, AMENDED, PENDING_APPROVAL)
 * - UNMATCHED: trade values differ from truth (has break/discrepancy)
 * - MATCHED:   trade values match truth (no discrepancy) — can be settled
 */
function classifyElectronicStatus(trade) {
  // 1. SETTLED — workflow complete
  if (SETTLED_STATUSES.includes(trade.currentStatus)) return "SETTLED";

  // 2. PENDING — in-process (user has acted, bot is working)
  if (PENDING_STATUSES.includes(trade.currentStatus)) return "PENDING";

  // 3. Compare actual values vs truth to determine MATCHED/UNMATCHED
  const hasDiscrepancy = checkForDiscrepancy(trade);
  return hasDiscrepancy ? "UNMATCHED" : "MATCHED";
}

/**
 * Check if a trade has any discrepancy between its current values
 * (settlementDetails + trade-level economics) and the settlement truth.
 * Returns true if there IS a break/discrepancy.
 */
function checkForDiscrepancy(trade) {
  const truth = trade.truths?.settlement || {};
  const details = trade.settlementDetails || {};
  const SSI_FIELDS = systemWorkflowEngine.SSI_FIELDS;

  // Check SSI fields
  for (const field of SSI_FIELDS) {
    const truthRaw = truth[field];
    const detailsRaw = details[field];
    const truthVal = (truthRaw === null || truthRaw === undefined || String(truthRaw).trim() === "-") ? "" : String(truthRaw).trim();
    const detailsVal = (detailsRaw === null || detailsRaw === undefined || String(detailsRaw).trim() === "-") ? "" : String(detailsRaw).trim();
    if (truthVal !== detailsVal) return true;
  }

  // Check trade-level economics
  const truthAmt = (truth.amount === null || truth.amount === undefined) ? "" : Number(truth.amount);
  const tradeAmt = (trade.amount === null || trade.amount === undefined) ? "" : Number(trade.amount);
  if (truthAmt !== tradeAmt) return true;

  const truthCcy = (truth.currency === null || truth.currency === undefined) ? "" : String(truth.currency).trim();
  const tradeCcy = (trade.currency === null || trade.currency === undefined) ? "" : String(trade.currency).trim();
  if (truthCcy !== tradeCcy) return true;

  const truthCpty = (truth.counterparty === null || truth.counterparty === undefined) ? "" : String(truth.counterparty).trim();
  const tradeCpty = (trade.counterparty === null || trade.counterparty === undefined) ? "" : String(trade.counterparty).trim();
  if (truthCpty !== tradeCpty) return true;

  return false; // No discrepancy — trade is MATCHED
}

// ======================================
// GET /trades — Fetch ALL ELECTRONIC settlement trades from DB
// All trades visible, but user can only act on assigned trades
// ======================================
router.get("/trades", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch ALL electronic trades from DB (not filtered by assignedTo)
    const trades = await Trade.find({
      settlementType: "ELECTRONIC",
      nextDesk: "SETTLEMENT"
    })
    .sort({ tradeDate: -1 })
    .lean();

    // Enrich trades with discrepancy-based classification + ownership flag
    const enrichedTrades = trades.map(t => ({
      ...t,
      electronicStatus: classifyElectronicStatus(t),
      isOwned: t.assignedTo === userId  // true = user can act on this trade
    }));

    // Compute status counts
    const counts = {
      MATCHED: 0,
      UNMATCHED: 0,
      PENDING: 0,
      SETTLED: 0
    };
    enrichedTrades.forEach(t => {
      if (counts[t.electronicStatus] !== undefined) counts[t.electronicStatus]++;
    });

    res.json({
      success: true,
      trades: enrichedTrades,
      counts,
      total: enrichedTrades.length,
      asOf: new Date().toISOString()
    });
  } catch (err) {
    console.error("[ElectronicSettlement] GET /trades error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// POST /settle — Settle a MATCHED trade DIRECTLY
// No bot verification for matched trades — settles immediately.
// ======================================
router.post("/settle", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.body;
    const userId = req.user.userId;

    // User can only settle trades assigned to them
    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) return res.status(404).json({ success: false, error: "Trade not found or not assigned to you" });

    // Only trades with NO discrepancy (MATCHED) can be settled directly
    const eStatus = classifyElectronicStatus(trade.toObject());
    if (eStatus !== "MATCHED") {
      return res.status(400).json({
        success: false,
        error: `Trade has discrepancies and cannot be settled. Resolve mismatches first.`
      });
    }

    // Settle directly — no verification bot for matched trades
    // Step through transitions to reach SETTLED from whatever current status
    let current = trade.currentStatus;

    // SETTLEMENT_PENDING → LIASING_WITH_CPTY (if needed)
    if (current === "SETTLEMENT_PENDING") {
      const p0 = trade.toObject();
      const s0 = LifecycleEngine.transition(p0, "LIASING_WITH_CPTY");
      trade.currentStatus = s0.currentStatus;
    }

    // LIASING_WITH_CPTY → PENDING_APPROVAL
    if (trade.currentStatus === "LIASING_WITH_CPTY") {
      const plain1 = trade.toObject();
      const step1 = LifecycleEngine.transition(plain1, "PENDING_APPROVAL");
      trade.currentStatus = step1.currentStatus;
    }

    // PENDING_APPROVAL or APPROVED → SETTLED
    if (trade.currentStatus === "PENDING_APPROVAL" || trade.currentStatus === "APPROVED") {
      const plain2 = trade.toObject();
      const step2 = LifecycleEngine.transition(plain2, "SETTLED");
      trade.currentStatus = step2.currentStatus;
    }

    await trade.save();

    await auditEngine.recordEvent(
      tradeRef, userId, "ELECTRONIC_SETTLED",
      `${current} → SETTLED | User settled matched trade directly via STCC Electronic Settlement`
    );

    // Emit WebSocket update for both workstation and electronic page
    try {
      const { getIo } = require("../engine/socketEngine");
      const io = getIo();
      if (io) io.to(`user_${userId}`).emit("trade_update", { tradeRef, currentStatus: trade.currentStatus });
    } catch (err) {}

    return res.json({ success: true, trade, currentStatus: trade.currentStatus });
  } catch (err) {
    console.error("[ElectronicSettlement] POST /settle error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ======================================
// POST /save-edit — Save user edits on an UNMATCHED trade
// Amends DIRECTLY (no system mailbox like bilateral).
// Then schedules bot verification. While verifying:
//   - Electronic page: trade shows in PENDING section
//   - Workstation: trade shows as PENDING_APPROVAL
// If bot approves → SETTLED. If bot rejects → SETTLEMENT_PENDING (UNMATCHED).
// ======================================
router.post("/save-edit", authenticateToken, async (req, res) => {
  try {
    const { tradeRef, editedFields } = req.body;
    const userId = req.user.userId;

    // User can only edit trades assigned to them
    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) return res.status(404).json({ success: false, error: "Trade not found or not assigned to you" });

    const eStatus = classifyElectronicStatus(trade.toObject());
    if (eStatus !== "UNMATCHED") {
      return res.status(400).json({
        success: false,
        error: `Trade has no discrepancies — it is already matched. Current status: ${trade.currentStatus}`
      });
    }

    // Apply the user's edits to settlementDetails
    if (editedFields && typeof editedFields === "object") {
      const SSI_FIELDS = systemWorkflowEngine.SSI_FIELDS;
      const oldDetails = trade.settlementDetails || {};
      const baseNumber = (trade.amendmentHistory || []).length;
      let seq = 0;

      for (const field of SSI_FIELDS) {
        if (editedFields[field] !== undefined && String(oldDetails[field]) !== String(editedFields[field])) {
          trade.amendmentHistory = trade.amendmentHistory || [];
          trade.amendmentHistory.push({
            amendmentNumber: baseNumber + (++seq),
            desk: "SETTLEMENT",
            field,
            oldValue: oldDetails[field],
            newValue: editedFields[field],
            source: "USER_STCC_ELECTRONIC",
            status: "APPLIED",
            appliedAt: new Date(),
            appliedBy: userId
          });
        }
      }

      // Also apply trade-level economics if edited
      if (editedFields.amount !== undefined) {
        trade.amount = Number(editedFields.amount);
      }
      if (editedFields.valueDate !== undefined) {
        trade.valueDate = new Date(editedFields.valueDate);
      }
      if (editedFields.currency !== undefined) {
        trade.currency = editedFields.currency;
      }
      if (editedFields.counterparty !== undefined) {
        trade.counterparty = editedFields.counterparty;
      }

      // Update settlement details
      trade.settlementDetails = {
        ...trade.settlementDetails,
        ...editedFields
      };

      if (trade.markModified) {
        trade.markModified("amendmentHistory");
        trade.markModified("settlementDetails");
      }
    }

    // ── DIRECT AMENDMENT (skip system mailbox) ──
    // Step through transitions to reach PENDING_APPROVAL directly
    // SETTLEMENT_PENDING → SETTLEMENT_BREAK → PENDING_AMENDMENT → AMENDED → PENDING_APPROVAL
    // Or SETTLEMENT_BREAK → PENDING_AMENDMENT → AMENDED → PENDING_APPROVAL

    if (trade.currentStatus === "SETTLEMENT_PENDING") {
      const p1 = trade.toObject();
      const s1 = LifecycleEngine.transition(p1, "SETTLEMENT_BREAK");
      trade.currentStatus = s1.currentStatus;
    }

    if (trade.currentStatus === "SETTLEMENT_BREAK" || trade.currentStatus === "REJECTED_REVERIFY") {
      const p2 = trade.toObject();
      const s2 = LifecycleEngine.transition(p2, "PENDING_AMENDMENT");
      trade.currentStatus = s2.currentStatus;
    }

    if (trade.currentStatus === "PENDING_AMENDMENT") {
      const p3 = trade.toObject();
      const s3 = LifecycleEngine.transition(p3, "AMENDED");
      trade.currentStatus = s3.currentStatus;
    }

    if (trade.currentStatus === "AMENDED") {
      const p4 = trade.toObject();
      const s4 = LifecycleEngine.transition(p4, "PENDING_APPROVAL");
      trade.currentStatus = s4.currentStatus;
    }

    trade.verificationErrors = [];
    await trade.save();

    // Schedule verification bot to check the edits
    // Bot will settle if correct, or revert to SETTLEMENT_PENDING if wrong
    await systemWorkflowEngine.scheduleVerification(trade, userId, "SETTLEMENT");

    await auditEngine.recordEvent(
      tradeRef, userId, "ELECTRONIC_EDIT_AMENDED",
      `Trade amended directly via STCC (skipping system mailbox). ${Object.keys(editedFields || {}).length} fields modified. Status → PENDING_APPROVAL. Awaiting bot verification.`
    );

    // Emit WebSocket update
    try {
      const { getIo } = require("../engine/socketEngine");
      const io = getIo();
      if (io) io.to(`user_${userId}`).emit("trade_update", { tradeRef, currentStatus: trade.currentStatus });
    } catch (err) {}

    return res.json({ success: true, trade, currentStatus: trade.currentStatus });
  } catch (err) {
    console.error("[ElectronicSettlement] POST /save-edit error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ======================================
// GET /trade/:tradeRef/truth — Get counterparty truth for comparison popup
// Only works for trades assigned to the user
// ======================================
router.get("/trade/:tradeRef/truth", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId }).lean();
    if (!trade) return res.status(404).json({ success: false, error: "Trade not found or not assigned to you" });

    const truth = trade.truths?.settlement || {};
    const current = trade.settlementDetails || {};

    // Compute mismatches
    const SSI_FIELDS = systemWorkflowEngine.SSI_FIELDS;
    const mismatches = [];
    
    for (const field of SSI_FIELDS) {
      const truthRaw = truth[field];
      const currentRaw = current[field];
      const truthVal = (truthRaw === null || truthRaw === undefined || String(truthRaw).trim() === "-") ? "" : String(truthRaw).trim();
      const currentVal = (currentRaw === null || currentRaw === undefined || String(currentRaw).trim() === "-") ? "" : String(currentRaw).trim();
      if (truthVal !== currentVal) {
        mismatches.push({
          field,
          currentValue: current[field],
          truthValue: truth[field]
        });
      }
    }

    // Also check trade-level economics
    const truthAmt = (truth.amount === null || truth.amount === undefined) ? "" : Number(truth.amount);
    const tradeAmt = (trade.amount === null || trade.amount === undefined) ? "" : Number(trade.amount);
    if (truthAmt !== tradeAmt) {
      mismatches.push({ field: "amount", currentValue: trade.amount, truthValue: truth.amount });
    }
    
    const truthCcy = (truth.currency === null || truth.currency === undefined) ? "" : String(truth.currency).trim();
    const tradeCcy = (trade.currency === null || trade.currency === undefined) ? "" : String(trade.currency).trim();
    if (truthCcy !== tradeCcy) {
      mismatches.push({ field: "currency", currentValue: trade.currency, truthValue: truth.currency });
    }
    
    const truthCpty = (truth.counterparty === null || truth.counterparty === undefined) ? "" : String(truth.counterparty).trim();
    const tradeCpty = (trade.counterparty === null || trade.counterparty === undefined) ? "" : String(trade.counterparty).trim();
    if (truthCpty !== tradeCpty) {
      mismatches.push({ field: "counterparty", currentValue: trade.counterparty, truthValue: truth.counterparty });
    }

    res.json({
      success: true,
      tradeRef,
      currentSide: {
        ...current,
        amount: trade.amount,
        valueDate: trade.valueDate,
        currency: trade.currency,
        counterparty: trade.counterparty,
        direction: trade.direction,
        product: trade.product,
        productType: trade.productType,
        tradeType: trade.tradeType,
        entity: trade.entity,
        tradeDate: trade.tradeDate
      },
      counterpartySide: {
        ...truth,
        direction: trade.direction,
        product: trade.product,
        productType: trade.productType,
        tradeType: trade.tradeType,
        entity: trade.entity,
        tradeDate: trade.tradeDate
      },
      mismatches,
      mismatchCount: mismatches.length
    });
  } catch (err) {
    console.error("[ElectronicSettlement] GET /truth error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
