// ======================================
// LEARNING PROFILE
// Persistent learning trajectory across sessions.
// Tracks improvement trends, weak areas, strengths,
// and repeated mistake patterns over time.
// Separate from CompetencyProfile — this focuses on
// learning behavior, not raw competency scores.
// ======================================

const mongoose = require("mongoose");

const LearningProfileSchema = new mongoose.Schema({

  userId: { type: String, required: true, unique: true, index: true },
  lastUpdated: { type: Date, default: Date.now },

  // Session history (most recent first)
  sessions: [{
    sessionId: String,
    desk: String,
    date: { type: Date, default: Date.now },
    overallScore: Number,
    criticalErrors: Number,
    decisionAccuracy: Number,
    workflowCompliance: Number,
    communicationScore: Number
  }],

  // Aggregated weak areas (competency names scoring < 70)
  weakAreas: [{ type: String }],

  // Aggregated strengths (competency names scoring > 85)
  strengths: [{ type: String }],

  // Repeated mistakes across all sessions
  repeatedMistakeCodes: [{
    code: String,
    title: String,
    count: { type: Number, default: 0 },
    lastOccurred: Date
  }],

  // Overall trend: computed from last 5 session scores
  improvementTrend: {
    type: String,
    enum: ["IMPROVING", "STABLE", "DECLINING", "INSUFFICIENT_DATA"],
    default: "INSUFFICIENT_DATA"
  },

  // Total sessions completed
  totalSessions: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model("LearningProfile", LearningProfileSchema);
