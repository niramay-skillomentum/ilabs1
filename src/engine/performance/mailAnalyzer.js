// ======================================
// MAIL ANALYZER
// Phase 1: Rule-based email evaluation (Zero AI).
// Evaluates every user-sent email against 10 structural
// rules for professional operational communication.
//
// Phase 2: Optional LLM deep assessment (only when
// rule score < 70 or explicitly requested).
// ======================================

const { getIsConnected } = require("../../db");

let MailEvaluation;
try {
  MailEvaluation = require("../../models/MailEvaluation");
} catch (e) {
  MailEvaluation = null;
}

// ── Rule Definitions ──

const RULES = {

  hasGreeting: {
    name: "Greeting",
    weight: 8,
    check: (body) => /^(hi|hello|dear|good\s+(morning|afternoon|evening)|greetings)/im.test(body)
  },

  hasSubject: {
    name: "Subject Line",
    weight: 10,
    check: (_body, subject) => subject && subject.trim().length > 5
  },

  hasTradeReference: {
    name: "Trade Reference",
    weight: 15,
    check: (body) => /TRD\d{3,}/i.test(body) || /trade\s*(ref|reference|id|number)/i.test(body)
  },

  hasRecipient: {
    name: "Addressed to Recipient",
    weight: 5,
    check: (body) => /^(hi|hello|dear)\s+\w+/im.test(body) || /team|desk|operations|settlements/i.test(body)
  },

  hasActionRequested: {
    name: "Action Requested",
    weight: 15,
    check: (body) => /(please|kindly|could you|would you|request|we need|action required|can you|we would appreciate)/i.test(body)
  },

  hasProfessionalTone: {
    name: "Professional Tone",
    weight: 10,
    check: (body) => {
      const casual = /(lol|omg|btw|gonna|wanna|idk|smh|tbh|nah|yep|yeah|ok so|hey dude|bro)/i;
      const aggressive = /(stupid|idiot|incompetent|ridiculous|pathetic)/i;
      return !casual.test(body) && !aggressive.test(body);
    }
  },

  hasProperStructure: {
    name: "Proper Structure",
    weight: 10,
    check: (body) => {
      // Check for paragraph breaks (at least 2 distinct sections)
      const lines = body.split(/\n/).filter(l => l.trim().length > 0);
      return lines.length >= 2;
    }
  },

  hasGrammar: {
    name: "Grammar & Spelling",
    weight: 7,
    check: (body) => {
      // Basic checks: starts with capital, ends with period/closing
      const sentences = body.split(/[.!?]/).filter(s => s.trim().length > 0);
      if (sentences.length === 0) return false;
      // At least first sentence should start with a capital letter
      const firstSentence = sentences[0].trim();
      return /^[A-Z]/.test(firstSentence);
    }
  },

  hasSignature: {
    name: "Signature / Closing",
    weight: 10,
    check: (body) => /(regards|sincerely|thank|best|cheers|kind regards|warm regards|yours|respectfully)/i.test(body)
  },

  hasContext: {
    name: "Operational Context",
    weight: 10,
    check: (body) => {
      // References specific operational concepts
      return /(settlement|confirmation|mismatch|discrepancy|amendment|SSI|value date|amount|currency|counterparty|break|reconciliation|booking)/i.test(body);
    }
  }
};

/**
 * Evaluate a single email using Phase 1 rules.
 *
 * @param {Object} params
 * @param {string} params.body - The email body
 * @param {string} params.subject - The email subject
 * @param {string} params.tradeRef - Trade reference
 * @param {string} params.sessionId - Session ID
 * @param {string} params.userId - User ID
 * @param {number} [params.messageIndex] - Position in conversation
 * @returns {Object} Evaluation result
 */
function evaluateEmail({ body, subject, tradeRef, sessionId, userId, messageIndex = 0 }) {
  const ruleResults = {};
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const [key, rule] of Object.entries(RULES)) {
    const passed = rule.check(body || "", subject || "");
    ruleResults[key] = passed;
    totalWeight += rule.weight;
    if (passed) earnedWeight += rule.weight;
  }

  const ruleScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const evaluation = {
    sessionId,
    tradeRef,
    userId,
    messageIndex,
    ruleResults,
    ruleScore,
    overallScore: ruleScore,
    emailBody: body || "",
    emailSubject: subject || ""
  };

  // Persist (fire-and-forget)
  if (getIsConnected() && MailEvaluation) {
    MailEvaluation.create(evaluation).catch(err => {
      console.warn("[OPI] Mail evaluation persist failed:", err.message);
    });
  }

  return evaluation;
}

/**
 * Evaluate all user-sent emails in a session.
 *
 * @param {Object[]} mailEvents - PerformanceEvents with eventType MAIL_SENT
 * @param {string} sessionId - Session ID
 * @returns {Object[]} Array of evaluation results
 */
function evaluateSessionEmails(mailEvents, sessionId) {
  const evaluations = [];

  for (let i = 0; i < mailEvents.length; i++) {
    const event = mailEvents[i];
    const body = event.payload?.body || "";
    const subject = event.metadata?.subject || event.payload?.subject || "";

    evaluations.push(evaluateEmail({
      body,
      subject,
      tradeRef: event.tradeRef,
      sessionId,
      userId: event.actor,
      messageIndex: i
    }));
  }

  return evaluations;
}

/**
 * Get aggregate mail analysis for a session.
 */
function aggregateMailAnalysis(evaluations) {
  if (!evaluations || evaluations.length === 0) {
    return { totalEmails: 0, avgScore: 0, weakRules: [], strongRules: [] };
  }

  const avgScore = Math.round(
    evaluations.reduce((sum, e) => sum + e.ruleScore, 0) / evaluations.length
  );

  // Find consistently weak rules (failed > 50% of the time)
  const ruleCounts = {};
  const ruleNames = Object.keys(RULES);

  for (const rule of ruleNames) {
    ruleCounts[rule] = { passed: 0, total: 0 };
  }

  for (const evaluation of evaluations) {
    for (const rule of ruleNames) {
      ruleCounts[rule].total++;
      if (evaluation.ruleResults[rule]) ruleCounts[rule].passed++;
    }
  }

  const weakRules = [];
  const strongRules = [];

  for (const [rule, counts] of Object.entries(ruleCounts)) {
    const passRate = counts.total > 0 ? counts.passed / counts.total : 0;
    if (passRate < 0.5) {
      weakRules.push({ rule, name: RULES[rule].name, passRate: Math.round(passRate * 100) });
    } else if (passRate >= 0.8) {
      strongRules.push({ rule, name: RULES[rule].name, passRate: Math.round(passRate * 100) });
    }
  }

  return {
    totalEmails: evaluations.length,
    avgScore,
    weakRules,
    strongRules
  };
}

module.exports = {
  evaluateEmail,
  evaluateSessionEmails,
  aggregateMailAnalysis,
  RULES
};
