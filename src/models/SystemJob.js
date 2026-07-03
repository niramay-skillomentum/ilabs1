const mongoose = require("mongoose");

// ======================================
// SYSTEM JOB QUEUE
// Delayed backend processing for the automated amendment + approval
// workflow. Rows are polled by systemWorkflowEngine.processJobs()
// (see server.js interval). Mirrors the PendingReply pattern but is
// isolated so the internal system workflow runs independently of the
// counterparty / FO communication channels.
// ======================================

const SystemJobSchema = new mongoose.Schema({
  tradeRef: { type: String, required: true, index: true },

  jobType: {
    type: String,
    required: true,
    enum: ["AMENDMENT", "VERIFICATION"]
  },

  // Owner of the trade — used to route the system mail to the right mailbox
  userId: { type: String, required: true, index: true },
  desk: { type: String, default: "SETTLEMENT" },
  settlementType: { type: String }, // BILATERAL | ELECTRONIC (context only)

  // When the job becomes eligible for processing
  sendAt: { type: Date, required: true, index: true },

  payload: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model("SystemJob", SystemJobSchema);
