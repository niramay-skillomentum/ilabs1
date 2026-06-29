const mongoose = require("mongoose");

const SessionScoreSchema = new mongoose.Schema({
  userId:        { type: String, required: true, index: true },
  desk:          { type: String, required: true },              // MO, CONFIRMATION, SETTLEMENT
  sessionId:     { type: String, required: true, unique: true }, // Usually Queue._id or session identifier
  sessionStart:  { type: Date },
  sessionEnd:    { type: Date },

  // ── Aggregate Scores ──
  totalPoints:    { type: Number, default: 0 },
  totalPenalties: { type: Number, default: 0 },
  finalScore:     { type: Number, default: 0 },  // totalPoints - totalPenalties
  grade:          { type: String, default: null }, // A+, A, B+, B, C, D, F

  // ── Per-Trade Breakdown ──
  tradeScores: [{
    tradeRef:       String,
    tradeType:      String,        // "CLEAN" or "BREAK"
    breakFields:    [String],      // e.g. ["amount", "currency"] — actual mismatches
    actions: [{
      action:         String,      // e.g. "MO_VALIDATE_PASS"
      timestamp:      Date,
      pointsAwarded:  Number,
      penaltyApplied: Number,
      verdict:        String,      // "CORRECT", "FALSE_POSITIVE", "FALSE_NEGATIVE", "PROCEDURAL", "PROCEDURAL_VIOLATION"
      reason:         String,      // Human-readable explanation
      commentQuality: Number       // Score for the comment
    }],
    emails: [{
      direction:    String,        // "SENT" or "RECEIVED"
      recipient:    String,        // "FO" or "COUNTERPARTY"
      body:         String,
      timestamp:    Date,
      qualityScore: Number,        // 0-10
      feedback:     String,        // "Good: mentioned specific field" or "Bad: too vague"
      issues:       [String]       // ["VAGUE", "UNPROFESSIONAL", etc.]
    }],
    timeSpentMs:       Number,     // Time from first action to final action on this trade
    velocityMultiplier: Number,    // 0.8x to 1.2x
    tradeSubtotal:     Number      // Final score for this trade
  }],

  // ── Category Scores (for radar chart / breakdown) ──
  categories: {
    accuracy:      { type: Number, default: 0 },   // Correct break detection
    communication: { type: Number, default: 0 },   // Email quality
    procedure:     { type: Number, default: 0 },   // Following proper escalation order
    velocity:      { type: Number, default: 0 },   // Speed of resolution
    auditQuality:  { type: Number, default: 0 }    // Comment quality
  },

  // ── Generated Feedback ──
  feedback: {
    strengths:     [{ type: String }],
    weaknesses:    [{ type: String }],
    improvements:  [{ type: String }],
    summary:       { type: String, default: null }
  }

}, { timestamps: true });

module.exports = mongoose.model("SessionScore", SessionScoreSchema);
