const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const Queue = require("../models/Queue");
const conversationEngine = require("../engine/conversationEngine");
const communicationEngine = require("../engine/communicationEngine");
const aiParser = require("../engine/aiParser");
const auditEngine = require("../engine/auditEngine");
const LifecycleEngine = require("../engine/lifecycle");
const { authenticateToken } = require("../middleware/auth");

router.post("/send", authenticateToken, async (req, res) => {
  const { tradeRef, sender, message, desk } = req.body;

  const subject = `Trade ${tradeRef} - Break Investigation`;

  await conversationEngine.createMessage(
    tradeRef,
    sender,
    message,
    subject,
    desk,
    true // skipEmit
  );

  // Parse user message
  const parsed = aiParser.parseEmail(message);

  // Find trade in DB
  const trade = await Trade.findOne({ tradeRef, assignedTo: { $ne: null } });

  let auditDetails = "";
  if (trade && (trade.currentStatus.startsWith("MO") || trade.currentStatus === "PENDING_FO_RESPONSE")) {
    // If trade was in MO_BREAK_OPEN, transition it to PENDING_FO_RESPONSE now that the email is sent
    if (trade.currentStatus === "MO_BREAK_OPEN") {
      const tradeObj = trade.toObject ? trade.toObject() : trade;
      const updatedTrade = LifecycleEngine.transition(tradeObj, "PENDING_FO_RESPONSE");
      trade.currentStatus = updatedTrade.currentStatus;
      trade.foResponseReceived = false;
      await trade.save();
    }

    // Schedule FO reply for MO desk communication
    communicationEngine.scheduleFOReply(
      tradeRef,
      trade,
      message
    );
    auditDetails = "Sent mail to FO";

    try {
      const { getIo } = require("../engine/socketEngine");
      const io = getIo();
      if (io) {
        io.emit("new_email", {
          tradeRef,
          sender,
          subject: subject || `Trade ${tradeRef}`,
          timestamp: new Date()
        });
      }
    } catch (err) {}
  } else {
    // Schedule CPTY reply (for confirmation/settlement desk communication)

    // Check for CPTY concession if booking matches universal truth, FO supports us, and we are manually emailing them
    const truthEngineMail = require("../engine/truthEngine");
    if (trade && trade.foEscalation && trade.foEscalation.status === "FO_SUPPORTS_US" && truthEngineMail.getMismatchFields(trade, "universal").length === 0) {
      if (trade.truths && trade.truths.confirmation) {
        trade.truths.confirmation.amount = trade.amount;
        trade.truths.confirmation.valueDate = trade.valueDate;
        trade.truths.confirmation.currency = trade.currency;
        trade.markModified('truths');
      }
    }

    if (desk === "CONFIRMATION") {
      const tradeObj = trade.toObject ? trade.toObject() : trade;
      const updatedTrade = LifecycleEngine.transition(tradeObj, "LIASING_WITH_CPTY");
      trade.currentStatus = updatedTrade.currentStatus;
      trade.cptyContactCount = (trade.cptyContactCount || 0) + 1;
    }

    await trade.save();

    try {
      const { getIo } = require("../engine/socketEngine");
      const io = getIo();
      if (io) {
        io.emit("new_email", {
          tradeRef,
          sender,
          subject: subject || `Trade ${tradeRef}`,
          timestamp: new Date()
        });
      }
    } catch (err) {}

    communicationEngine.scheduleReply(
      tradeRef,
      subject,
      message,
      desk
    );
    auditDetails = "Sent mail to Counterparty";
  }

  auditEngine.recordEvent(
    tradeRef,
    sender,
    "EMAIL_SENT",
    auditDetails
  ).catch(e => console.warn("DB audit:", e.message));

  res.json({ success: true });
});

router.post("/resolve", authenticateToken, async (req, res) => {
  const { tradeRef } = req.body;
  const userId = req.user.userId;

  // Find trade in DB assigned to any user
  let trade = await Trade.findOne({ tradeRef, assignedTo: { $ne: null } });

  if (!trade) {
    return res.status(404).json({ error: "Trade not found" });
  }

  // Guard: FO must have responded before resolve is allowed
  if (!trade.foResponseReceived) {
    return res.status(400).json({
      error: "Cannot resolve — awaiting FO response"
    });
  }

  // Mark conversation resolved
  trade.conversation = trade.conversation || {};
  trade.conversation.status = "RESOLVED";
  trade.conversation.resolvedAt = new Date();

  // Resolve in DB
  conversationEngine.resolveConversation(tradeRef).catch(e => console.warn("DB resolve:", e.message));

  // Accept all pending amendments
  if (trade.pendingAmendments) {
    trade.pendingAmendments.forEach(a => {
      a.status = "ACCEPTED";
    });
  }

  // Apply accepted amendments
  if (trade.pendingAmendments) {
    trade.pendingAmendments.forEach(a => {
      if (a.status === "ACCEPTED") {
        trade[a.field] = a.newValue;
      }
    });
    trade.pendingAmendments = [];
  }

  // Transition to MO_PENDING
  try {
    const updated = LifecycleEngine.transition(trade.toObject ? trade.toObject() : trade, "MO_PENDING");
    trade.currentStatus = updated.currentStatus;
    trade.nextDesk = "MO";
  } catch (err) {
    console.error("Resolve transition error:", err.message);
    return res.status(400).json({
      error: "Cannot transition trade: " + err.message
    });
  }

  // Save to DB
  await trade.save();

  res.json({
    success: true,
    message: "Conversation resolved — trade moved to MO_PENDING",
    newStatus: trade.currentStatus
  });

  // Audit
  auditEngine.recordEvent(
    trade.tradeRef,
    userId,
    "BREAK_RESOLVED",
    "User resolved the break and applied pending amendments"
  ).catch(e => console.warn("DB audit:", e.message));
});

router.get("/shared", authenticateToken, async (req, res) => {
  const { desk } = req.query;
  const results = [];
  const processedTradeRefs = new Set();

  try {
    const Conversation = require("../models/Conversation");

    // Fetch conversations from DB where this desk ever participated
    if (desk) {
      const dbConversations = await Conversation.find({ desks: desk }).lean();
      for (const conv of dbConversations) {
        if (processedTradeRefs.has(conv.tradeRef)) continue;
        if (conv.messages && conv.messages.length > 0) {
          results.push({ tradeRef: conv.tradeRef, conversation: conv });
          processedTradeRefs.add(conv.tradeRef);
        }
      }
    }

    // Also check for trades assigned to users on this desk
    if (desk) {
      const activeQueues = await Queue.find({ desk, isActive: true }).lean();
      for (const q of activeQueues) {
        for (const tradeRef of q.trades) {
          if (processedTradeRefs.has(tradeRef)) continue;
          const conv = await conversationEngine.getConversation(tradeRef);
          if (conv && conv.messages && conv.messages.length > 0) {
            results.push({ tradeRef, conversation: conv });
            processedTradeRefs.add(tradeRef);
          }
        }
      }
    }

    // Resolve trades for all collected conversations via a single bulk query
    const tradeRefs = results.map(item => item.tradeRef);
    const tradesList = await Trade.find({ tradeRef: { $in: tradeRefs } }).lean();
    const tradeMap = {};
    tradesList.forEach(t => { tradeMap[t.tradeRef] = t; });

    const finalResults = [];
    for (const item of results) {
      let trade = tradeMap[item.tradeRef];

      if (!trade) {
        trade = {
          tradeRef: item.tradeRef,
          counterparty: "Unknown (Archived)",
          currency: "N/A",
          amount: 0,
          currentStatus: item.conversation.status || "OPEN"
        };
      }

      finalResults.push({
        trade,
        conversation: {
          subject: item.conversation.messages[0]?.subject || item.conversation.subject || `Trade ${item.tradeRef}`,
          status: item.conversation.status,
          messages: item.conversation.messages.map(m => ({
            sender: m.sender,
            body: m.body,
            subject: m.subject,
            timestamp: m.timestamp
          }))
        }
      });
    }

    // Sort by latest message
    finalResults.sort((a, b) => {
      const aLast = a.conversation.messages[a.conversation.messages.length - 1];
      const bLast = b.conversation.messages[b.conversation.messages.length - 1];
      return (bLast.timestamp || 0) - (aLast.timestamp || 0);
    });

    res.json({ success: true, conversations: finalResults });

  } catch (err) {
    console.error("Shared inbox error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/personal", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const Conversation = require("../models/Conversation");
    const conversations = await Conversation.find({
      "messages.sender": userId
    }).lean();

    const results = [];

    // Resolve trades for all conversations via a single bulk query
    const tradeRefs = conversations.map(c => c.tradeRef);
    const tradesList = await Trade.find({ tradeRef: { $in: tradeRefs } }).lean();
    const tradeMap = {};
    tradesList.forEach(t => { tradeMap[t.tradeRef] = t; });

    for (const conv of conversations) {
      let trade = tradeMap[conv.tradeRef];

      if (!trade) {
        trade = {
          tradeRef: conv.tradeRef,
          counterparty: "Unknown (Archived)",
          currency: "N/A",
          amount: 0,
          currentStatus: conv.status
        };
      }

      results.push({
        trade,
        conversation: {
          subject: conv.messages[0]?.subject || `Trade ${conv.tradeRef}`,
          status: conv.status,
          messages: conv.messages.map(m => ({
            sender: m.sender,
            body: m.body,
            subject: m.subject,
            timestamp: m.timestamp
          }))
        }
      });
    }

    results.sort((a, b) => {
      const aLast = a.conversation.messages[a.conversation.messages.length - 1];
      const bLast = b.conversation.messages[b.conversation.messages.length - 1];
      return (bLast.timestamp || 0) - (aLast.timestamp || 0);
    });

    res.json({ success: true, conversations: results });

  } catch (err) {
    console.error("Personal inbox error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:tradeRef", authenticateToken, async (req, res) => {
  const { tradeRef } = req.params;

  const conversation = await conversationEngine.getConversation(tradeRef);

  if (!conversation) {
    return res.json({
      success: true,
      subject: `Trade ${tradeRef}`,
      messages: []
    });
  }

  return res.json({
    success: true,
    subject: conversation.subject,
    messages: conversation.messages
  });
});

module.exports = router;
