const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const queueComposer = require("../engine/queueComposer");
const LifecycleEngine = require("../engine/lifecycle");
const auditEngine = require("../engine/auditEngine");
const conversationEngine = require("../engine/conversationEngine");
const communicationEngine = require("../engine/communicationEngine");
const foInternalChannel = require("../engine/foInternalChannel");
const amendmentEngine = require("../engine/amendmentEngine");
const { authenticateToken } = require("../middleware/auth");
const { getIo } = require("../engine/socketEngine");
const systemWorkflowEngine = require("../engine/systemWorkflowEngine");

// ======================================
// GET ALL TRADES (DB-BACKED)
// ======================================
router.get("/all", authenticateToken, async (req, res) => {
  try {
    // Bound the result set — this feeds the MO-risk page and must not return
    // the whole collection unboundedly. Page via ?limit & ?skip.
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    const trades = await Trade.find({})
      .select('tradeRef tradeDate valueDate currentStatus nextDesk amount currency counterparty direction entity foRegion product tradeType settlementType age truths pendingAmendments')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit + 1) // fetch one extra to detect more pages
      .lean();

    const hasMore = trades.length > limit;
    res.json({
      success: true,
      trades: hasMore ? trades.slice(0, limit) : trades,
      hasMore
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// TRADE ACTION (DB-BACKED)
// ======================================
router.post("/action", authenticateToken, async (req, res) => {
  try {
    let { trade: tradeFromBody, action, issueType, comment } = req.body;
    const userId = req.user.userId;

    // Always fetch from DB — do not trust client trade object
    const sessionTrade = await Trade.findOne({
      tradeRef: tradeFromBody.tradeRef,
      assignedTo: userId
    });

    if (!sessionTrade) {
      return res.status(404).json({ error: "Trade not found in session" });
    }

    if (!comment || comment.trim() === "") {
      return res.status(400).json({
        error: "Comment is mandatory"
      });
    }

    // Touch session
    await queueComposer.touchSession(userId);

    const currentStatus = sessionTrade.currentStatus;

    const allowedActions = {
      MO_VALIDATE_PASS: ["MO_PENDING", "PENDING_FO_RESPONSE"],
      MO_RAISE_BREAK: ["MO_PENDING"],
      MO_SEND_TO_FO: ["MO_BREAK_OPEN"],

      CONFIRM_TRADE: ["LIASING_WITH_CPTY", "CONFIRMATION_PENDING"],
      CONFIRM_RAISE_BREAK: ["LIASING_WITH_CPTY"],
      CONFIRM_SEND_TO_CPTY: ["CONFIRMATION_PENDING", "CONFIRMATION_BREAK", "LIASING_WITH_FO", "LIASING_WITH_CPTY"],
      CONFIRM_REJECT_CLAIM: ["CONFIRMATION_BREAK"],
      CONFIRM_REQUEST_EVIDENCE: ["CONFIRMATION_BREAK"],
      CONFIRM_ESCALATE_TO_FO: ["CONFIRMATION_BREAK", "LIASING_WITH_CPTY", "LIASING_WITH_FO"],
      CONFIRM_RAISE_AMENDMENT: ["CONFIRMATION_BREAK"],
      CONFIRM_APPROVE_AMENDMENT: ["CONFIRMATION_BREAK"],
      CONFIRM_RESEND: ["CONFIRMATION_PENDING"],

      SETTLEMENT_APPROVE: ["LIASING_WITH_CPTY", "AMENDED"],
      SETTLEMENT_RAISE_BREAK: ["LIASING_WITH_CPTY"],
      SETTLEMENT_MAIL_CPTY: ["SETTLEMENT_PENDING"]
    };

    if (!allowedActions[action] || !allowedActions[action].includes(currentStatus)) {
      return res.status(400).json({ error: "Invalid action for current state" });
    }

    if (
      action === "MO_VALIDATE_PASS" &&
      currentStatus === "PENDING_FO_RESPONSE" &&
      !sessionTrade.foResponseReceived
    ) {
      return res.status(400).json({ error: "Await FO response before validating" });
    }

    let nextStatus;
    let nextDesk;

    switch (action) {

      case "MO_VALIDATE_PASS":
        // Ensure conversation is resolved before applying amendments
        if (sessionTrade.pendingAmendments && sessionTrade.pendingAmendments.length > 0) {
          if (!sessionTrade.conversation || sessionTrade.conversation.status !== "RESOLVED") {
            return res.status(400).json({
              error: "Resolve conversation before validating amendments"
            });
          }
        }

        nextStatus = "CONFIRMATION_PENDING";
        nextDesk = "CONFIRMATION";

        // Apply accepted amendments
        if (sessionTrade.pendingAmendments) {
          sessionTrade.pendingAmendments.forEach(a => {
            if (a.status === "ACCEPTED") {
              sessionTrade[a.field] = a.newValue;
            }
          });
          sessionTrade.pendingAmendments = [];
        }

        break;

      case "MO_RAISE_BREAK":
        nextStatus = "MO_BREAK_OPEN";
        nextDesk = "MO";
        break;

      case "MO_SEND_TO_FO":
        nextStatus = "PENDING_FO_RESPONSE";
        sessionTrade.foResponseReceived = false;
        nextDesk = "MO";
        break;

      case "CONFIRM_TRADE":
        nextStatus = "SETTLEMENT_PENDING";
        nextDesk = "SETTLEMENT";
        break;

      case "CONFIRM_RAISE_BREAK":
        const cptyCount = sessionTrade.cptyContactCount || 0;
        const foCount = sessionTrade.foContactCount || 0;
        if (cptyCount !== 1 || foCount > 0) {
            return res.status(400).json({ error: "Confirmation Break can only be raised once, after first counterparty contact." });
        }
        nextStatus = "CONFIRMATION_BREAK";
        nextDesk = "CONFIRMATION";
        break;

      case "CONFIRM_REJECT_CLAIM":
        // Reject counterparty's claim, revert to pending
        nextStatus = "CONFIRMATION_PENDING";
        nextDesk = "CONFIRMATION";
        
        // If FO supports us AND booking matches universal truth, pushing back makes CPTY concede
        const truthEngineForReject = require("../engine/truthEngine");
        if (sessionTrade.foEscalation && sessionTrade.foEscalation.status === "FO_SUPPORTS_US" && truthEngineForReject.getMismatchFields(sessionTrade, "universal").length === 0) {
          if (sessionTrade.truths && sessionTrade.truths.confirmation) {
            sessionTrade.truths.confirmation.amount = sessionTrade.amount;
            sessionTrade.truths.confirmation.valueDate = sessionTrade.valueDate;
            sessionTrade.truths.confirmation.currency = sessionTrade.currency;
            sessionTrade.markModified('truths');
          }
        }
        break;

      case "CONFIRM_REQUEST_EVIDENCE":
        // Ask counterparty for supporting documents — stays in BREAK
        nextStatus = "CONFIRMATION_BREAK";
        nextDesk = "CONFIRMATION";

        // If FO supports us AND booking matches universal truth, requesting evidence makes CPTY double check and concede
        const truthEngineForEvidence = require("../engine/truthEngine");
        if (sessionTrade.foEscalation && sessionTrade.foEscalation.status === "FO_SUPPORTS_US" && truthEngineForEvidence.getMismatchFields(sessionTrade, "universal").length === 0) {
          if (sessionTrade.truths && sessionTrade.truths.confirmation) {
            sessionTrade.truths.confirmation.amount = sessionTrade.amount;
            sessionTrade.truths.confirmation.valueDate = sessionTrade.valueDate;
            sessionTrade.truths.confirmation.currency = sessionTrade.currency;
            sessionTrade.markModified('truths');
          }
        }

        // Record evidence request
        if (!sessionTrade.confirmationScenario) {
          sessionTrade.confirmationScenario = { evidence: [] };
        }
        if (!sessionTrade.confirmationScenario.evidence) {
          sessionTrade.confirmationScenario.evidence = [];
        }
        sessionTrade.confirmationScenario.evidence.push({
          type: "EVIDENCE_REQUEST",
          provided: false,
          requestedAt: new Date()
        });

        await conversationEngine.createMessage(
          sessionTrade.tradeRef,
          userId,
          comment,
          "Evidence Request - Trade " + sessionTrade.tradeRef
        );

        communicationEngine.scheduleReply(
          sessionTrade.tradeRef,
          "RE: Evidence Request",
          "Evidence documentation requested"
        );
        break;

      case "CONFIRM_ESCALATE_TO_FO":
        nextStatus = "LIASING_WITH_FO";
        nextDesk = "CONFIRMATION";
        sessionTrade.foResponseReceived = false;

        // Update FO escalation
        sessionTrade.foEscalation = sessionTrade.foEscalation || {};
        sessionTrade.foEscalation.status = "PENDING";
        sessionTrade.foEscalation.escalatedAt = new Date();

        // Open FO internal channel and send the message
        sessionTrade.foContactCount = (sessionTrade.foContactCount || 0) + 1;
        await foInternalChannel.openChannel(sessionTrade.tradeRef, userId, "CONFIRMATION");
        await foInternalChannel.sendMessage(sessionTrade.tradeRef, userId, comment, "USER");
        foInternalChannel.scheduleFOInternalReply(
          sessionTrade.tradeRef,
          sessionTrade,
          comment,
          "CONFIRMATION"
        );
        break;

      case "CONFIRM_RAISE_AMENDMENT":
        // Raise an amendment — stays in BREAK until approved
        nextStatus = "CONFIRMATION_BREAK";
        nextDesk = "CONFIRMATION";
        break;

      case "CONFIRM_APPROVE_AMENDMENT":
        // Approve and apply pending amendments, recheck
        nextStatus = "CONFIRMATION_PENDING";
        nextDesk = "CONFIRMATION";

        // Accept and apply all pending amendments
        if (sessionTrade.pendingAmendments) {
          sessionTrade.pendingAmendments.forEach(a => {
            a.status = "ACCEPTED";
          });
          amendmentEngine.applyAllAccepted(sessionTrade, userId);
        }
        break;

      case "CONFIRM_RESEND":
        // Resend confirmation after amendment
        nextStatus = "LIASING_WITH_CPTY";
        nextDesk = "CONFIRMATION";

        await conversationEngine.createMessage(
          sessionTrade.tradeRef,
          userId,
          comment,
          "Trade Confirmation (Amended)"
        );

        communicationEngine.scheduleReply(
          sessionTrade.tradeRef,
          "RE: Trade Confirmation (Amended)",
          "Counterparty reviewing amended confirmation"
        );
        break;

      case "CONFIRM_SEND_TO_CPTY":
        nextStatus = "LIASING_WITH_CPTY";
        nextDesk = "CONFIRMATION";
        sessionTrade.cptyResponseReceived = false;
        
        sessionTrade.cptyContactCount = (sessionTrade.cptyContactCount || 0) + 1;

        await conversationEngine.createMessage(
          sessionTrade.tradeRef,
          userId,
          comment,
          "Trade Confirmation Request",
          "CONFIRMATION"
        );

        // Schedule proactive response from CPTY
        communicationEngine.scheduleReply(
          sessionTrade.tradeRef,
          "RE: Trade Confirmation Request",
          comment,
          "CONFIRMATION"
        );
        break;

      case "CONFIRM_SEND_BACK_TO_MO":
        nextStatus = "MO_BREAK_OPEN";
        nextDesk = "MO";
        break;

      case "SETTLEMENT_APPROVE":
        // User sends for approval → bot will verify
        nextStatus = "PENDING_APPROVAL";
        nextDesk = "SETTLEMENT";
        
        // After lifecycle transition + save, schedule the verification bot
        // We handle this inline before the generic transition below
        {
          const tradeObj = sessionTrade.toObject ? sessionTrade.toObject() : sessionTrade;
          const updatedTrade = LifecycleEngine.transition(tradeObj, nextStatus);
          sessionTrade.currentStatus = updatedTrade.currentStatus;
          sessionTrade.nextDesk = nextDesk;
          await sessionTrade.save();
          
          // Schedule verification bot job
          await systemWorkflowEngine.scheduleVerification(sessionTrade, userId, "SETTLEMENT");
          
          // Audit
          auditEngine.recordEvent(
            sessionTrade.tradeRef, userId, action,
            comment || "User sent trade for approval"
          ).catch(e => console.warn("DB audit:", e.message));
          
          const activeQueue = await queueComposer.getActiveQueue(userId);
          const trades = activeQueue ? activeQueue.trades : [];
          res.json({ success: true, queueSize: trades.length, trades });
          
          try {
            const io = getIo();
            io.to(`user_${userId}`).emit("trade_update", {
              tradeRef: sessionTrade.tradeRef,
              currentStatus: updatedTrade.currentStatus
            });
          } catch (err) {}
          return; // Skip the generic transition below
        }

      case "SETTLEMENT_RAISE_BREAK":
        nextStatus = "SETTLEMENT_BREAK";
        nextDesk = "SETTLEMENT";
        break;

      case "SETTLEMENT_MAIL_CPTY":
        nextStatus = "LIASING_WITH_CPTY";
        nextDesk = "SETTLEMENT";

        await conversationEngine.createMessage(
          sessionTrade.tradeRef,
          userId,
          comment,
          "Settlement SSI Inquiry",
          "SETTLEMENT"
        );

        communicationEngine.scheduleReply(
          sessionTrade.tradeRef,
          "RE: Settlement SSI Inquiry",
          comment,
          "SETTLEMENT"
        );
        break;

      case "SETTLEMENT_SEND_BACK_TO_MO":
        nextStatus = "PENDING_FO_RESPONSE";
        nextDesk = "MO";
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    // Perform lifecycle transition
    const tradeObj = sessionTrade.toObject ? sessionTrade.toObject() : sessionTrade;
    const updatedTrade = LifecycleEngine.transition(tradeObj, nextStatus);

    // Update trade in DB
    sessionTrade.currentStatus = updatedTrade.currentStatus;
    sessionTrade.nextDesk = nextDesk;
    await sessionTrade.save();

    // Fetch updated queue for response
    const activeQueue = await queueComposer.getActiveQueue(userId);
    const trades = activeQueue ? activeQueue.trades : [];

    // Respond
    res.json({
      success: true,
      queueSize: trades.length,
      trades: trades
    });

    // Broadcast WebSocket event
    try {
      const io = getIo();
      io.to(`user_${userId}`).emit("trade_update", {
        tradeRef: sessionTrade.tradeRef,
        currentStatus: updatedTrade.currentStatus
      });
    } catch (err) {
      // Ignored
    }

    // Audit (fire-and-forget)
    auditEngine.recordEvent(
      sessionTrade.tradeRef,
      userId,
      action,
      comment || "Action taken on trade"
    ).catch(e => console.warn("DB audit:", e.message));

  } catch (err) {
    console.error("Trade action error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
