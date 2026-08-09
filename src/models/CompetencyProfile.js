// ======================================
// COMPETENCY PROFILE
// Persistent, cross-session competency profile per user.
// Updated after each session by the competencyEngine.
// Tracks 10 operational competency dimensions with
// historical scores for trend analysis.
// ======================================

const mongoose = require("mongoose");

const CompetencyHistoryEntry = new mongoose.Schema({
  sessionId: String,
  desk: String,
  score: Number,
  date: { type: Date, default: Date.now }
}, { _id: false });

const CompetencyDimension = new mongoose.Schema({
  score: { type: Number, default: 0 },           // Current score (0–100)
  history: [CompetencyHistoryEntry]               // Score trend across sessions
}, { _id: false });

const CompetencyProfileSchema = new mongoose.Schema({

  userId: { type: String, required: true, unique: true, index: true },
  lastUpdated: { type: Date, default: Date.now },

  competencies: {
    workflowDiscipline:      { type: CompetencyDimension, default: () => ({}) },
    operationalAccuracy:     { type: CompetencyDimension, default: () => ({}) },
    decisionQuality:         { type: CompetencyDimension, default: () => ({}) },
    attentionToDetail:       { type: CompetencyDimension, default: () => ({}) },
    communication:           { type: CompetencyDimension, default: () => ({}) },
    escalationJudgment:      { type: CompetencyDimension, default: () => ({}) },
    timeManagement:          { type: CompetencyDimension, default: () => ({}) },
    settlementKnowledge:     { type: CompetencyDimension, default: () => ({}) },
    confirmationKnowledge:   { type: CompetencyDimension, default: () => ({}) },
    reconciliationKnowledge: { type: CompetencyDimension, default: () => ({}) }
  },

  totalSessions: { type: Number, default: 0 },
  overallReadiness: { type: Number, default: 0 }    // 0–100 weighted aggregate

}, { timestamps: true });

module.exports = mongoose.model("CompetencyProfile", CompetencyProfileSchema);
