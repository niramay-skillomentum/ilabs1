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
    required: true
  },
  subject: { type: String },
  body: { type: String },
  userMessage: { type: String },
  escalationContext: { type: String },
  desk: { type: String }, // To identify which desk triggered this reply
  isFinalReply: { type: Boolean, default: false },
  payload: { type: mongoose.Schema.Types.Mixed } // Stores complex response objects like cptyResponse or foResponse
}, { timestamps: true });

// Hot query shape used by claimNextReply / processReplies: { replyType, sendAt: {$lte} }
pendingReplySchema.index({ replyType: 1, sendAt: 1 });
// TTL: auto-reap orphaned/never-claimed replies 1h after their scheduled time.
// This single-field sendAt index also serves range scans.
pendingReplySchema.index({ sendAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model("PendingReply", pendingReplySchema);
