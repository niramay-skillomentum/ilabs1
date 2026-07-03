const mongoose = require("mongoose");

// ======================================
// INTERNAL SYSTEM MAILBOX
// A dedicated, isolated mailbox that ONLY receives system-generated
// workflow notifications (amendment / approval / verification results).
// Completely separate from Conversation (the CPTY / FO channels).
// The UI renders it as an Inbox-only mailbox (channel=SYSTEM).
// ======================================

const SystemMailSchema = new mongoose.Schema({
  // Recipient — the settlement user who owns the trade
  userId: { type: String, required: true, index: true },

  tradeRef: { type: String, index: true },

  from: { type: String, default: "System" },
  subject: { type: String, required: true },
  body: { type: String, required: true },

  // Machine-readable action: AMENDED | APPROVED | VERIFICATION_FAILED
  action: { type: String },

  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("SystemMail", SystemMailSchema);
