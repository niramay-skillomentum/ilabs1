const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");
const foInternalChannel = require("../engine/foInternalChannel");
const { authenticateToken } = require("../middleware/auth");

// ======================================
// FO INTERNAL CHANNEL APIs
// ======================================

router.get("/list", authenticateToken, async (req, res) => {
  try {
    const desk = req.query.desk;
    const channels = await require("../models/FOCommunication").find({ desk }).lean();
    const tradeRefs = channels.map(c => c.tradeRef);
    const trades = await Trade.find({ tradeRef: { $in: tradeRefs } }).lean();

    const tradeMap = {};
    trades.forEach(t => tradeMap[t.tradeRef] = t);

    const result = channels.map(c => {
      const t = tradeMap[c.tradeRef];
      if (!t) return null;
      return {
        trade: t,
        conversation: {
          messages: c.messages.map(m => ({
            sender: m.senderRole === "FO" ? "FO" : (m.sender || "Unknown User"),
            body: m.message,
            timestamp: m.timestamp
          }))
        }
      };
    }).filter(x => x !== null);

    res.json({ success: true, conversations: result });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:tradeRef", authenticateToken, async (req, res) => {
  try {
    const channel = await foInternalChannel.getChannel(req.params.tradeRef);
    if (!channel) return res.json({ channel: null, messages: [] });
    res.json({ channel: channel.status, messages: channel.messages });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/send", authenticateToken, express.json(), async (req, res) => {
  try {
    const { tradeRef, message } = req.body;
    if (!tradeRef || !message) return res.status(400).json({ error: "Missing fields" });

    const trade = await Trade.findOne({ tradeRef });
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    // Transition state if not already liaising with FO
    if (trade.currentStatus !== "LIASING_WITH_FO" && trade.currentStatus !== "PENDING_FO_RESPONSE") {
      if (trade.currentStatus.startsWith("MO")) {
          trade.currentStatus = "PENDING_FO_RESPONSE";
      } else {
          trade.currentStatus = "LIASING_WITH_FO";
      }
      trade.foResponseReceived = false;
      trade.foEscalation = trade.foEscalation || {};
      trade.foEscalation.escalatedAt = new Date();
      trade.foContactCount = (trade.foContactCount || 0) + 1;
      await trade.save();
    }

    const deskContext = trade.currentStatus === "PENDING_FO_RESPONSE" ? "MO" : "CONFIRMATION";
    await foInternalChannel.openChannel(tradeRef, req.user.userId, deskContext);
    await foInternalChannel.sendMessage(tradeRef, req.user.userId, message, "USER");
    
    // Auto schedule an FO reply based on user's new message
    foInternalChannel.scheduleFOInternalReply(tradeRef, trade, message, deskContext);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
