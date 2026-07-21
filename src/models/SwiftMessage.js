// ======================================
// SWIFT MESSAGE MODEL
// Stores generated SWIFT messages (MT103, MT202, MT202COV)
// with full audit trail and traceability back to the
// settlement that triggered generation.
//
// Each settled trade may produce 1 or 2 messages:
//   - MT103 only         (NON BANK, no agent)
//   - MT202 only         (BANK)
//   - MT103 + MT202COV   (NON BANK, with agent)
// ======================================

const mongoose = require("mongoose");

const SwiftMessageSchema = new mongoose.Schema({

  // Trade traceability
  tradeRef: { type: String, required: true, index: true },
  settlementRef: { type: String },

  // Message classification
  messageType: {
    type: String,
    required: true,
    enum: ["MT103", "MT202", "MT202COV"]
  },

  // Rendered SWIFT message text
  messagePayload: { type: String, required: true },

  // Key SWIFT fields (stored separately for querying)
  senderBIC: { type: String },
  receiverBIC: { type: String },
  amount: { type: Number },
  currency: { type: String },
  valueDate: { type: Date },

  // Classification
  counterpartyType: { type: String },
  defaultSwift: { type: String },       // MT103 or MT202 from SSI Reference
  paymentDirection: { type: String },   // PAY or RECEIVE

  // Field-level mapping snapshot (JSON of tag→value pairs)
  fieldMap: { type: mongoose.Schema.Types.Mixed },

  // Related messages (MT103 ↔ MT202COV pairs)
  relatedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "SwiftMessage" }],

  // Generation metadata
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: String },        // userId or "SYSTEM"
  status: {
    type: String,
    default: "GENERATED",
    enum: ["GENERATED", "SENT", "FAILED", "REGENERATED"]
  },

  // Validation errors (if status is FAILED)
  validationErrors: [{ type: String }]

}, { timestamps: true });

// Lookup by trade
SwiftMessageSchema.index({ tradeRef: 1, messageType: 1 }, { name: "swift_trade_type_idx" });

// Lookup by status
SwiftMessageSchema.index({ status: 1, generatedAt: -1 }, { name: "swift_status_idx" });

module.exports = mongoose.model("SwiftMessage", SwiftMessageSchema);
