const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const auditEngine = require("../engine/auditEngine");
const { authenticateToken } = require("../middleware/auth");
const scoringEngine = require("../engine/scoringEngine");
const LifecycleEngine = require("../engine/lifecycle");
const systemWorkflowEngine = require("../engine/systemWorkflowEngine");

router.post("/select-type", authenticateToken, async (req, res) => {
  try {
    const { tradeRef, selectedType } = req.body;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) {
      return res.status(404).json({ success: false, error: "Trade not found in session" });
    }

    const actualType = trade.truths?.settlement?.settlementType;
    if (!actualType) {
      return res.status(400).json({ success: false, error: "Trade does not have a valid settlement type" });
    }

    if (selectedType === actualType) {
      // Success
      await auditEngine.recordEvent(
        tradeRef,
        userId,
        "SETTLEMENT_TYPE_SELECTED",
        `User correctly selected ${selectedType}`
      );
      return res.json({ success: true, redirect: `/settlement/${selectedType.toLowerCase()}` });
    } else {
      // Failure
      // Apply penalty (10 points configurable logic can be extended here)
      await scoringEngine.applyPenalty(userId, tradeRef, 10, "Incorrect Settlement Type selected");

      await auditEngine.recordEvent(
        tradeRef,
        userId,
        "SETTLEMENT_TYPE_FAILED",
        `User incorrectly selected ${selectedType}, actual was ${actualType}`
      );
      
      return res.status(400).json({ success: false, error: "Incorrect Settlement Type" });
    }

  } catch (err) {
    console.error("Settlement select-type error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// SYSTEM AMENDMENT + AUTOMATED APPROVAL WORKFLOW
// Shared endpoints used by both the Workstation and the Bilateral /
// Electronic settlement dashboards. All transitions go through the
// systemWorkflowEngine so the state machine stays authoritative.
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

// ======================================
// BILATERAL SETTLEMENT ENDPOINTS
// ======================================

router.get("/bilateral/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId }).lean();
    if (!trade) {
      return res.status(404).json({ success: false, error: "Trade not found in session" });
    }

    res.json({ success: true, trade });
  } catch (err) {
    console.error("Fetch bilateral trade error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/bilateral/action", authenticateToken, async (req, res) => {
  try {
    const { tradeRef, action, editData } = req.body;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) {
      return res.status(404).json({ success: false, error: "Trade not found in session" });
    }

    const currentStatus = trade.currentStatus;

    if (action === "APPROVE_SETTLEMENT") {
      // Validate that system details exactly match truth details
      const system = trade.settlementDetails || {};
      const truth = trade.truths?.settlement || {};
      
      const fieldsToCheck = [
        "beneficiaryName", "beneficiaryBank", "beneficiaryBIC",
        "accountNumber", "accountType", "currency",
        "settlementMethod", "correspondentBank", "paymentReference"
      ];

      let isMatch = true;
      for (const field of fieldsToCheck) {
        if (system[field] !== truth[field]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        trade.currentStatus = "SETTLED";
        await trade.save();
        await auditEngine.recordEvent(tradeRef, userId, "SETTLEMENT_APPROVED", "User successfully approved settlement.");
        return res.json({ success: true, trade });
      } else {
        await scoringEngine.applyPenalty(userId, tradeRef, 10, "Attempted to settle trade with incorrect SSI details");
        await auditEngine.recordEvent(tradeRef, userId, "SETTLEMENT_APPROVAL_FAILED", "Attempted to settle with mismatching details.");
        return res.status(400).json({ success: false, error: "System details do not match the expected truth. Please fix the discrepancies first." });
      }
    } 
    else if (action === "RAISE_BREAK") {
      if (currentStatus !== "SETTLEMENT_PENDING") {
        return res.status(400).json({ success: false, error: "Invalid action for current state" });
      }
      trade.currentStatus = "SETTLEMENT_BREAK";
      await trade.save();
      await auditEngine.recordEvent(tradeRef, userId, "SETTLEMENT_BREAK_RAISED", "User raised a settlement break.");
      
      // Emit websocket event so the workstation updates
      try {
        const { getIo } = require("../engine/socketEngine");
        const io = getIo();
        if (io) io.to(`user_${userId}`).emit("trade_update", { tradeRef, currentStatus: "SETTLEMENT_BREAK" });
      } catch (err) {}

      return res.json({ success: true, trade });
    }
    else if (action === "MAIL_CPTY") {
      if (currentStatus !== "SETTLEMENT_BREAK") {
        return res.status(400).json({ success: false, error: "Trade must be in SETTLEMENT_BREAK to mail CPTY" });
      }
      trade.currentStatus = "LIASING_WITH_CPTY";
      await trade.save();
      await auditEngine.recordEvent(tradeRef, userId, "MAIL_CPTY", "User sent email to Counterparty regarding settlement break.");
      
      try {
        const { getIo } = require("../engine/socketEngine");
        const io = getIo();
        if (io) io.to(`user_${userId}`).emit("trade_update", { tradeRef, currentStatus: "LIASING_WITH_CPTY" });
      } catch (err) {}

      return res.json({ success: true, trade });
    }
    else {
      return res.status(400).json({ success: false, error: "Unknown action" });
    }

  } catch (err) {
    console.error("Bilateral action error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ======================================
// ELECTRONIC SETTLEMENT ENDPOINTS
// ======================================

router.get("/electronic/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const { tradeRef } = req.params;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId }).lean();
    if (!trade) {
      return res.status(404).json({ success: false, error: "Trade not found in session" });
    }

    res.json({ success: true, trade });
  } catch (err) {
    console.error("Fetch electronic trade error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/electronic/action", authenticateToken, async (req, res) => {
  try {
    const { tradeRef, action, editData } = req.body;
    const userId = req.user.userId;

    const trade = await Trade.findOne({ tradeRef, assignedTo: userId });
    if (!trade) {
      return res.status(404).json({ success: false, error: "Trade not found in session" });
    }

    const currentStatus = trade.currentStatus;

    if (action === "APPROVE_SETTLEMENT") {
      // Validate that system details exactly match truth details
      const system = trade.settlementDetails || {};
      const truth = trade.truths?.settlement || {};
      
      const fieldsToCheck = [
        "beneficiaryName", "beneficiaryBank", "beneficiaryBIC",
        "accountNumber", "accountType", "currency",
        "settlementMethod", "correspondentBank", "paymentReference"
      ];

      let isMatch = true;
      for (const field of fieldsToCheck) {
        if (system[field] !== truth[field]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        trade.currentStatus = "SETTLED";
        await trade.save();
        await auditEngine.recordEvent(tradeRef, userId, "SETTLEMENT_APPROVED", "User successfully approved electronic settlement.");
        return res.json({ success: true, trade });
      } else {
        await scoringEngine.applyPenalty(userId, tradeRef, 10, "Attempted to settle trade with incorrect SSI details");
        await auditEngine.recordEvent(tradeRef, userId, "SETTLEMENT_APPROVAL_FAILED", "Attempted to settle with mismatching details.");
        return res.status(400).json({ success: false, error: "System details do not match the expected truth. Please fix the discrepancies first." });
      }
    } 
    else if (action === "RAISE_BREAK") {
      if (currentStatus !== "SETTLEMENT_PENDING") {
        return res.status(400).json({ success: false, error: "Invalid action for current state" });
      }
      trade.currentStatus = "SETTLEMENT_BREAK";
      await trade.save();
      await auditEngine.recordEvent(tradeRef, userId, "SETTLEMENT_BREAK_RAISED", "User raised a settlement break.");
      
      try {
        const { getIo } = require("../engine/socketEngine");
        const io = getIo();
        if (io) io.to(`user_${userId}`).emit("trade_update", { tradeRef, currentStatus: "SETTLEMENT_BREAK" });
      } catch (err) {}

      return res.json({ success: true, trade });
    }

    else {
      return res.status(400).json({ success: false, error: "Unknown action" });
    }

  } catch (err) {
    console.error("Electronic action error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
