// ======================================
// MAIL EVALUATION
// Per-email rule-based evaluation result for OPI.
// Phase 1: deterministic rule checks (10 structural rules).
// Phase 2: optional LLM evaluation for deeper assessment
// (only triggered when rule score < 70).
// ======================================

const mongoose = require("mongoose");

const MailEvaluationSchema = new mongoose.Schema({

  sessionId: { type: String, required: true, index: true },
  tradeRef: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  messageIndex: { type: Number, default: 0 },       // Position in conversation

  // Phase 1: Rule-based checks (deterministic, zero AI)
  ruleResults: {
    hasGreeting: { type: Boolean, default: false },
    hasSubject: { type: Boolean, default: false },
    hasTradeReference: { type: Boolean, default: false },
    hasRecipient: { type: Boolean, default: false },
    hasActionRequested: { type: Boolean, default: false },
    hasProfessionalTone: { type: Boolean, default: false },
    hasProperStructure: { type: Boolean, default: false },
    hasGrammar: { type: Boolean, default: false },
    hasSignature: { type: Boolean, default: false },
    hasContext: { type: Boolean, default: false }
  },
  ruleScore: { type: Number, default: 0 },            // 0–100

  // Phase 2: LLM evaluation (only if deeper assessment needed)
  llmEvaluated: { type: Boolean, default: false },
  llmEvaluation: {
    professionalism: { type: Number, default: null },
    structure: { type: Number, default: null },
    completeness: { type: Number, default: null },
    operationalAccuracy: { type: Number, default: null },
    tone: { type: Number, default: null },
    coaching: { type: String, default: null }
  },

  overallScore: { type: Number, default: 0 },         // Combined score
  emailBody: { type: String, default: "" },            // Preserved for evidence
  emailSubject: { type: String, default: "" }

}, { timestamps: true });

MailEvaluationSchema.index({ sessionId: 1, tradeRef: 1 });

module.exports = mongoose.model("MailEvaluation", MailEvaluationSchema);
