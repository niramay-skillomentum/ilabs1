const mongoose = require("mongoose");

const pendingReplySchema = new mongoose.Schema({
  tradeRef: { 
    type: String, 
    required: true,
    index: true 
  },
  replyType: { 
    type: String, 
    required: true, 
    enum: ["CPTY_EMAIL", "FO_EMAIL", "FO_INTERNAL"] 
  },
  sendAt: { 
    type: Date, 
    required: true,
    index: true 
  },
  subject: { type: String },
  body: { type: String },
  userMessage: { type: String },
  escalationContext: { type: String },
  desk: { type: String }, // To identify which desk triggered this reply
  isFinalReply: { type: Boolean, default: false },
  payload: { type: mongoose.Schema.Types.Mixed } // Stores complex response objects like cptyResponse or foResponse
}, { timestamps: true });

module.exports = mongoose.model("PendingReply", pendingReplySchema);
