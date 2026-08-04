const mongoose = require("mongoose");

const LearningEventSchema = new mongoose.Schema({

  eventId: { type: String, required: true, unique: true, index: true },
  tradeRef: { type: String, index: true, default: null },
  userId: { type: String, required: true, index: true },
  desk: { type: String, default: "UNKNOWN" },
  action: { type: String, default: null },

  // Mistake identification
  mistakeCode: { type: String, required: true, index: true },
  severity: { type: String, enum: ["INFO", "WARNING", "ERROR", "CRITICAL"], required: true },
  severityLabel: { type: String },
  severityColor: { type: String },

  // Educational content
  title: { type: String, required: true },
  mentorIntro: { type: String },
  message: { type: String },
  whyItMatters: { type: String },
  realWorldImpact: [{ type: String }],
  correctAction: { type: String },

  // Scoring
  scoreImpact: { type: Number, default: 0 },
  xpReward: { type: Number, default: 0 },

  // Learning metadata
  relatedTopic: { type: String, default: null },
  learnMoreLink: { type: String, default: null },
  repeatCount: { type: Number, default: 1 },

  // User interaction tracking
  viewed: { type: Boolean, default: false },
  dismissed: { type: Boolean, default: false },
  tutorOpened: { type: Boolean, default: false },
  viewedAt: { type: Date, default: null },
  dismissedAt: { type: Date, default: null },

  timestamp: { type: Date, default: Date.now }

}, { timestamps: true });

// Compound indexes for analytics and repeat-tracking
LearningEventSchema.index({ userId: 1, mistakeCode: 1 });
LearningEventSchema.index({ userId: 1, timestamp: -1 });
LearningEventSchema.index({ desk: 1, mistakeCode: 1 });

module.exports = mongoose.model("LearningEvent", LearningEventSchema);
