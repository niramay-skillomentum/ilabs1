// ======================================
// PERFORMANCE REPORT
// The final generated report document for OPI.
// Contains all deterministic analysis results plus
// AI-generated narrative sections. Three views
// (Student, Mentor, Manager) are derived from
// the same underlying document.
// ======================================

const mongoose = require("mongoose");

// Per-trade analysis sub-document
const TradeAnalysisSchema = new mongoose.Schema({
  tradeRef: String,
  desk: String,
  scenario: String,                    // e.g. "SSI_MISMATCH", "CLEAN", "AMOUNT_MISMATCH"
  difficulty: String,                  // BEGINNER | INTERMEDIATE | ADVANCED
  direction: String,                   // BUY | SELL
  settlementType: String,             // BILATERAL | ELECTRONIC

  // Workflow comparison
  expectedWorkflow: [String],
  actualWorkflow: [String],
  skippedSteps: [String],
  unnecessarySteps: [String],
  workflowCompliance: Number,          // 0–100

  // Decision analysis
  decisions: [{
    action: String,
    isCorrect: Boolean,
    expectedDecision: String,
    evidence: String,
    operationalRisk: String,           // LOW | MEDIUM | HIGH | CRITICAL
    learningPoint: String
  }],

  // Expected vs Actual action table
  actionComparison: [{
    expectedAction: String,
    userPerformed: Boolean,
    isCorrect: Boolean,
    reason: String
  }],

  // Mail evaluation (if applicable)
  mailScore: Number,
  mailDetails: mongoose.Schema.Types.Mixed,

  // Operational impact
  operationalImpact: String,

  // AI-generated coaching for this trade
  aiCoaching: String,

  // Overall trade rating (1–5)
  overallRating: Number

}, { _id: false });

// Evidence graph entry
const EvidenceEntrySchema = new mongoose.Schema({
  finding: String,
  evidence: [{
    type: { type: String },
    ref: String
  }],
  confidence: { type: Number, default: 100 },
  relatedTrades: [String],
  supportingEventCount: Number
}, { _id: false });

const PerformanceReportSchema = new mongoose.Schema({

  reportId: { type: String, required: true, unique: true, index: true },
  sessionId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  desk: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },

  // ── Deterministic Sections ──

  sessionKPIs: {
    totalTrades: Number,
    tradesCompleted: Number,
    cleanTrades: Number,
    breakTrades: Number,
    correctDecisions: Number,
    incorrectDecisions: Number,
    decisionAccuracy: Number,          // 0–100
    avgWorkflowCompliance: Number,     // 0–100
    avgTimePerTrade: Number,           // seconds
    totalSessionTime: Number,          // seconds
    criticalErrors: Number,
    emailsSent: Number,
    avgMailScore: Number
  },

  tradeAnalyses: [TradeAnalysisSchema],

  workflowCompliance: {
    overallCompliance: Number,
    totalStepsExpected: Number,
    totalStepsCompleted: Number,
    totalStepsSkipped: Number,
    totalUnnecessarySteps: Number
  },

  decisionAnalysis: {
    totalDecisions: Number,
    correctDecisions: Number,
    incorrectDecisions: Number,
    accuracy: Number,
    highRiskErrors: Number,
    decisions: [mongoose.Schema.Types.Mixed]
  },

  competencyScores: {
    workflowDiscipline: Number,
    operationalAccuracy: Number,
    decisionQuality: Number,
    attentionToDetail: Number,
    communication: Number,
    escalationJudgment: Number,
    timeManagement: Number,
    settlementKnowledge: Number,
    confirmationKnowledge: Number,
    reconciliationKnowledge: Number
  },

  timeline: [mongoose.Schema.Types.Mixed],

  repeatedMistakes: [{
    mistakeCode: String,
    title: String,
    count: Number,
    severity: String,
    trades: [String]
  }],

  mailEvaluations: [mongoose.Schema.Types.Mixed],

  evidenceGraph: [EvidenceEntrySchema],

  benchmarks: {
    avgTimePerTradeBenchmark: Number,
    peerPercentile: Number,
    competencyPercentiles: mongoose.Schema.Types.Mixed
  },

  recommendations: [String],

  // ── AI-Generated Sections ──

  executiveSummary: { type: String, default: "" },
  tradeCoaching: [{ tradeRef: String, coaching: String }],
  communicationCoaching: { type: String, default: "" },
  improvementPlan: { type: String, default: "" },
  mentorSummary: { type: String, default: "" },
  managerSummary: { type: String, default: "" },

  // ── Generation Metadata ──

  aiTokensUsed: { type: Number, default: 0 },
  generationTimeMs: { type: Number, default: 0 },

  // Future: premium reports (paid immediate generation vs free 24hr)
  isPremium: { type: Boolean, default: false }

}, { timestamps: true });

// Efficient lookups
PerformanceReportSchema.index({ userId: 1, generatedAt: -1 });

module.exports = mongoose.model("PerformanceReport", PerformanceReportSchema);
