const express = require("express");
const router = express.Router();
const SystemMail = require("../models/SystemMail");
const Trade = require("../models/Trade");
const { authenticateToken } = require("../middleware/auth");

// ======================================
// INTERNAL SYSTEM MAILBOX (Inbox-only)
// Serves system-generated workflow notifications for the logged-in user.
// Response shape matches /api/conversations/personal so the existing
// communication UI (channel=SYSTEM) can reuse its inbox mappers.
// ======================================

router.get("/list", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const mails = await SystemMail.find({ userId }).sort({ timestamp: 1 }).lean();

    // Group mails by tradeRef into conversation-like threads
    const byTrade = {};
    for (const m of mails) {
      const key = m.tradeRef || "SYSTEM";
      if (!byTrade[key]) byTrade[key] = [];
      byTrade[key].push(m);
    }

    const tradeRefs = Object.keys(byTrade);
    const tradesList = await Trade.find({ tradeRef: { $in: tradeRefs } }).lean();
    const tradeMap = {};
    tradesList.forEach(t => { tradeMap[t.tradeRef] = t; });

    const conversations = tradeRefs.map(ref => {
      const thread = byTrade[ref];
      let trade = tradeMap[ref];
      if (!trade) {
        trade = { tradeRef: ref, counterparty: "System", currency: "N/A", amount: 0, currentStatus: "SYSTEM" };
      }
      return {
        trade,
        conversation: {
          subject: thread[0]?.subject || `System — ${ref}`,
          status: "SYSTEM",
          messages: thread.map(m => ({
            sender: "System",
            body: m.body,
            subject: m.subject,
            timestamp: m.timestamp
          }))
        }
      };
    });

    // Sort by most recent message
    conversations.sort((a, b) => {
      const aLast = a.conversation.messages[a.conversation.messages.length - 1];
      const bLast = b.conversation.messages[b.conversation.messages.length - 1];
      return new Date(bLast.timestamp) - new Date(aLast.timestamp);
    });

    res.json({ success: true, conversations });
  } catch (err) {
    console.error("System mailbox list error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark all system mail for a trade as read
router.post("/read", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { tradeRef } = req.body;
  try {
    const filter = { userId, read: false };
    if (tradeRef) filter.tradeRef = tradeRef;
    await SystemMail.updateMany(filter, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
