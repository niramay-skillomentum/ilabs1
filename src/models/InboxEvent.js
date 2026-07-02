const mongoose = require("mongoose");

const InboxEventSchema = new mongoose.Schema({
  tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true, index: true },
  assignedTo: { type: String, required: true, index: true }, // userId
  eventType: { type: String, required: true }, // e.g., 'SYSTEM_MESSAGE', 'COUNTERPARTY_MESSAGE', 'SETTLEMENT_UPDATE'
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model("InboxEvent", InboxEventSchema);
