const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const auditEngine = require("../engine/auditEngine");
const { authenticateToken } = require("../middleware/auth");
const scoringEngine = require("../engine/scoringEngine");
const LifecycleEngine = require("../engine/lifecycle");
const systemWorkflowEngine = require("../engine/systemWorkflowEngine");

// ======================================
// SETTLEMENT WORKFLOW ENGINE ROUTES
// Drives the amendment + automated approval workflow:
//   SETTLEMENT_BREAK → scheduleAmendment() → PENDING_AMENDMENT
//     → system processes → AMENDED → scheduleVerification() → PENDING_APPROVAL
//     → Verification Bot → SETTLED | SETTLEMENT_PENDING (rejected, returns to pool if session expired)
// ======================================

// Send to System for Amendment (replaces the old manual SSI edit).
// Routes the request to the Internal System Mailbox — no external email.
router.post("/amend", authenticateToken, async (req, res) => {
  try {
    const { tradeRef, settlementType } = req.body;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) return res.status(404).json({ success: false, error: "Trade not found in session" });

    if (!["SETTLEMENT_BREAK", "REJECTED_REVERIFY"].includes(trade.currentStatus)) {
      return res.status(400).json({ success: false, error: "Amendment can only be requested from a raised break or after a failed verification." });
    }

    await systemWorkflowEngine.scheduleAmendment(trade, userId, "SETTLEMENT", settlementType);
    return res.json({ success: true, trade, currentStatus: trade.currentStatus });
  } catch (err) {
    console.error("Amend error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Send for Approval — triggers the System Verification Bot.
router.post("/send-for-approval", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.body;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) return res.status(404).json({ success: false, error: "Trade not found in session" });

    if (trade.currentStatus !== "AMENDED") {
      return res.status(400).json({ success: false, error: "Trade must be AMENDED before it can be sent for approval." });
    }

    await systemWorkflowEngine.scheduleVerification(trade, userId, "SETTLEMENT");
    return res.json({ success: true, trade, currentStatus: trade.currentStatus });
  } catch (err) {
    console.error("Send-for-approval error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Final settlement after automated approval.
router.post("/settle", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.body;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) return res.status(404).json({ success: false, error: "Trade not found in session" });

    if (trade.currentStatus !== "APPROVED") {
      return res.status(400).json({ success: false, error: "Trade must be APPROVED before settlement." });
    }

    const plain = trade.toObject();
    const updated = LifecycleEngine.transition(plain, "SETTLED");
    trade.currentStatus = updated.currentStatus;
    await trade.save();

    await auditEngine.recordEvent(tradeRef, userId, "SETTLEMENT_SETTLED", "APPROVED → SETTLED | User settled approved trade.");

    try {
      const { getIo } = require("../engine/socketEngine");
      const io = getIo();
      if (io) io.to(`user_${userId}`).emit("trade_update", { tradeRef, currentStatus: "SETTLED" });
    } catch (err) {}

    return res.json({ success: true, trade, currentStatus: trade.currentStatus });
  } catch (err) {
    console.error("Settle error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
