const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },   // "USER", "FO", "COUNTERPARTY"
  body: { type: String, required: true },
  subject: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const ConversationSchema = new mongoose.Schema({

  tradeRef: { type: String, required: true, index: true },
  desk: { type: String, required: true, default: "GENERAL" },
  status: { type: String, default: "OPEN" },
  readBy: [{ type: String }],
  messages: [MessageSchema]

}, { timestamps: true });

// Personal-inbox query: Conversation.find({ "messages.sender": userId })
ConversationSchema.index({ "messages.sender": 1 });
ConversationSchema.index({ tradeRef: 1, desk: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
