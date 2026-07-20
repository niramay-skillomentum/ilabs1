// ======================================
// SWIFT MESSAGE MODEL
// Persists generated SWIFT payment messages (MT103, MT202, MT202 COV).
// Each trade may have 1-2 messages (MT103 alone, MT202 alone,
// or MT103 + MT202 COV together).
//
// Messages are generated after a trade reaches SETTLED status.
// The messageContent field stores the raw SWIFT text block;
// the fields sub-document stores parsed values for UI display.
// ======================================

const mongoose = require("mongoose");

const SwiftMessageSchema = new mongoose.Schema({

  tradeRef: { type: String, required: true, index: true },
  settlementRef: { type: String, required: true },
  ssiRef: { type: String, required: true },
  messageType: { type: String, required: true, enum: ["MT103", "MT202", "MT202COV"] },
  direction: { type: String },          // BUY or SELL
  counterpartyType: { type: String },   // "Bank" or "Non-Bank"

  // Raw SWIFT message content (formatted text block)
  messageContent: { type: String, required: true },

  // Parsed fields for UI display
  fields: {
    field20: String,    // Transaction Reference Number
    field21: String,    // Related Reference (MT202/COV only)
    field23B: String,   // Bank Operation Code
    field32A: String,   // Value Date / Currency / Interbank Settled Amount
    field33B: String,   // Currency / Original Ordered Amount
    field50A: String,   // Ordering Customer (Payer) — BIC
    field50K: String,   // Ordering Customer — Name & Address
    field52A: String,   // Ordering Institution (Payer's Bank)
    field52D: String,   // Ordering Institution — Name & Address
    field53A: String,   // Sender's Correspondent (Bank)
    field54A: String,   // Receiver's Correspondent (Bank)
    field56A: String,   // Intermediary (Bank)
    field57A: String,   // Account With Institution (Beneficiary's Bank)
    field58A: String,   // Beneficiary Institution (MT202 only)
    field59: String,    // Beneficiary
    field70: String,    // Remittance Information (Payment Reference)
    field71A: String,   // Details of Charges (BEN / OUR / SHA)
    field72: String,    // Sender to Receiver Information
    field77B: String    // Regulatory Reporting
  },

  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: String }

}, { timestamps: true });

// Compound index for fetching all messages for a trade
SwiftMessageSchema.index(
  { tradeRef: 1, messageType: 1 },
  { name: "swift_trade_msg_idx" }
);

module.exports = mongoose.model("SwiftMessage", SwiftMessageSchema);
