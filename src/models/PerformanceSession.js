// ======================================
// PERFORMANCE SESSION
// Represents a complete user session (one per queue build).
// Links to the Queue and stores session-level metadata
// for the OPI (Operations Performance Intelligence) platform.
// ======================================

const mongoose = require("mongoose");

const PerformanceSessionSchema = new mongoose.Schema({

  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  desk: { type: String, required: true },             // MO | CONFIRMATION | SETTLEMENT | RECONCILIATION

  tradeRefs: [{ type: String }],                       // The trades assigned in this session

  sessionStart: { type: Date, required: true },
  sessionEnd: { type: Date, default: null },

  status: {
    type: String,
    enum: ["ACTIVE", "COMPLETED", "EXPIRED"],
    default: "ACTIVE",
    index: true
  },

  // Report linkage
  reportGenerated: { type: Boolean, default: false },
  reportId: { type: String, default: null },

  // Session summary (populated at session end)
  summary: {
    totalTrades: { type: Number, default: 0 },
    tradesCompleted: { type: Number, default: 0 },
    tradesWithBreaks: { type: Number, default: 0 },
    totalEventsRecorded: { type: Number, default: 0 }
  }

}, { timestamps: true });

// Efficient lookup: active sessions per user
PerformanceSessionSchema.index({ userId: 1, status: 1 });
// Time-range queries for analytics
PerformanceSessionSchema.index({ sessionStart: -1 });

module.exports = mongoose.model("PerformanceSession", PerformanceSessionSchema);
