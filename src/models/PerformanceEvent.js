// ======================================
// PERFORMANCE EVENT
// Normalized event stream for OPI.
// Every meaningful operational action across all engines
// becomes one of these documents. This is the single
// source of truth for the entire OPI analysis pipeline.
// ======================================

const mongoose = require("mongoose");

const PerformanceEventSchema = new mongoose.Schema({

  sessionId: { type: String, required: true, index: true },
  tradeRef: { type: String, default: null, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  desk: { type: String, default: null },

  // Event classification
  eventType: {
    type: String,
    required: true,
    index: true
    // TRADE_OPENED | AUDIT_VIEWED | MAIL_READ | VALIDATION_ATTEMPT |
    // BREAK_RAISED | AMENDMENT_APPLIED | MAIL_SENT | DECISION_MADE |
    // TUTOR_OPENED | QUEUE_ASSIGNED | LOGIN | LOGOUT |
    // VERIFICATION_RESULT | LEARNING_EVENT | TRADE_FORWARDED |
    // SSI_VERIFIED | TRADE_SETTLED | TRADE_CLOSED | etc.
  },

  actor: { type: String, required: true },             // userId or "SYSTEM"

  category: {
    type: String,
    enum: ["WORKFLOW", "DECISION", "COMMUNICATION", "LEARNING", "LIFECYCLE", "QUEUE", "SYSTEM"],
    default: "WORKFLOW"
  },

  // Flexible structured data for the specific event
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Raw event data preserved for evidence tracing
  payload: { type: mongoose.Schema.Types.Mixed, default: {} }

}, { timestamps: true });

// Compound indexes for OPI pipeline queries
PerformanceEventSchema.index({ sessionId: 1, tradeRef: 1, timestamp: 1 });
PerformanceEventSchema.index({ sessionId: 1, eventType: 1 });
PerformanceEventSchema.index({ actor: 1, timestamp: -1 });

module.exports = mongoose.model("PerformanceEvent", PerformanceEventSchema);
