// ======================================
// COMPETENCY ENGINE
// Calculates 10 operational competency dimensions
// from deterministic analysis results. Zero AI.
//
// Each competency is scored 0–100 using weighted
// formulas based on the analyzer outputs. Feeds
// into the persistent CompetencyProfile.
// ======================================

const { getIsConnected } = require("../../db");

let CompetencyProfile;
try {
  CompetencyProfile = require("../../models/CompetencyProfile");
} catch (e) {
  CompetencyProfile = null;
}

/**
 * Calculate all 10 competency dimensions from analysis results.
 *
 * @param {Object} params
 * @param {Object} params.workflowAnalysis - Output from workflowAnalyzer.analyzeSession()
 * @param {Object} params.decisionAnalysis - Output from decisionAnalyzer.aggregateDecisions()
 * @param {Object} params.timelineAnalysis - Output from timelineAnalyzer.buildTimeline()
 * @param {Object[]} params.mailEvaluations - Array of mail evaluation results
 * @param {Object[]} params.learningEvents - Learning events from the session
 * @param {string} params.desk - The desk
 * @param {Object[]} params.trades - The trade objects
 * @returns {Object} Competency scores (0–100 each)
 */
function calculateCompetencies({
  workflowAnalysis,
  decisionAnalysis,
  timelineAnalysis,
  mailEvaluations,
  learningEvents,
  desk,
  trades
}) {

  // 1. Workflow Discipline: Average workflow compliance across all trades
  const workflowDiscipline = workflowAnalysis?.overallCompliance || 0;

  // 2. Operational Accuracy: % of trades where the final outcome was correct
  //    (correct validation on clean, correct break on break)
  const operationalAccuracy = calculateOperationalAccuracy(decisionAnalysis, trades);

  // 3. Decision Quality: Direct from decision analyzer accuracy
  const decisionQuality = decisionAnalysis?.accuracy || 0;

  // 4. Attention to Detail: Based on break detection rate and mismatch identification
  //    Higher score if user identifies issues before making decisions
  const attentionToDetail = calculateAttentionToDetail(workflowAnalysis, decisionAnalysis, learningEvents);

  // 5. Communication: Average mail rule scores
  const communication = calculateCommunicationScore(mailEvaluations);

  // 6. Escalation Judgment: % of escalations that were appropriate
  const escalationJudgment = calculateEscalationScore(decisionAnalysis, workflowAnalysis);

  // 7. Time Management: Based on avg time per trade vs benchmark
  const timeManagement = calculateTimeManagement(timelineAnalysis);

  // 8. Settlement Knowledge: Decision accuracy on settlement scenarios
  const settlementKnowledge = desk === "SETTLEMENT" ? decisionQuality : 0;

  // 9. Confirmation Knowledge: Decision accuracy on confirmation scenarios
  const confirmationKnowledge = desk === "CONFIRMATION" ? decisionQuality : 0;

  // 10. Reconciliation Knowledge: Decision accuracy on reconciliation scenarios
  const reconciliationKnowledge = desk === "RECONCILIATION" ? decisionQuality : 0;

  return {
    workflowDiscipline: clamp(workflowDiscipline),
    operationalAccuracy: clamp(operationalAccuracy),
    decisionQuality: clamp(decisionQuality),
    attentionToDetail: clamp(attentionToDetail),
    communication: clamp(communication),
    escalationJudgment: clamp(escalationJudgment),
    timeManagement: clamp(timeManagement),
    settlementKnowledge: clamp(settlementKnowledge),
    confirmationKnowledge: clamp(confirmationKnowledge),
    reconciliationKnowledge: clamp(reconciliationKnowledge)
  };
}

/**
 * Calculate the weighted overall readiness score.
 */
function calculateOverallReadiness(competencies) {
  const weights = {
    workflowDiscipline: 0.15,
    operationalAccuracy: 0.20,
    decisionQuality: 0.20,
    attentionToDetail: 0.10,
    communication: 0.10,
    escalationJudgment: 0.05,
    timeManagement: 0.10,
    settlementKnowledge: 0.05,
    confirmationKnowledge: 0.03,
    reconciliationKnowledge: 0.02
  };

  let weighted = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = competencies[key] || 0;
    // Only count competencies that have been evaluated (> 0)
    if (score > 0) {
      weighted += score * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
}

/**
 * Update the persistent CompetencyProfile for a user.
 */
async function updateProfile(userId, competencies, sessionId, desk) {
  if (!getIsConnected() || !CompetencyProfile) return null;

  try {
    const historyEntry = { sessionId, desk, date: new Date() };
    const update = {
      $set: {
        lastUpdated: new Date(),
        overallReadiness: calculateOverallReadiness(competencies)
      },
      $inc: { totalSessions: 1 }
    };

    // Push new history entry for each competency
    for (const [key, score] of Object.entries(competencies)) {
      update.$set[`competencies.${key}.score`] = score;
      if (!update.$push) update.$push = {};
      update.$push[`competencies.${key}.history`] = {
        $each: [{ ...historyEntry, score }],
        $slice: -50  // Keep last 50 entries
      };
    }

    const profile = await CompetencyProfile.findOneAndUpdate(
      { userId },
      update,
      { upsert: true, returnDocument: "after" }
    );

    console.log(`[OPI] CompetencyProfile updated for ${userId}: readiness=${profile.overallReadiness}%`);
    return profile;
  } catch (err) {
    console.warn("[OPI] CompetencyProfile update failed:", err.message);
    return null;
  }
}

/**
 * Get a user's competency profile.
 */
async function getProfile(userId) {
  if (!getIsConnected() || !CompetencyProfile) return null;

  try {
    return await CompetencyProfile.findOne({ userId }).lean();
  } catch (err) {
    console.warn("[OPI] CompetencyProfile fetch failed:", err.message);
    return null;
  }
}

// ── Internal Calculation Helpers ──

function calculateOperationalAccuracy(decisionAnalysis, trades) {
  if (!decisionAnalysis?.decisions || decisionAnalysis.decisions.length === 0) return 100;

  // Group decisions by trade and check if the final decision per trade was correct
  const tradeDecisions = {};
  for (const d of decisionAnalysis.decisions) {
    if (!tradeDecisions[d.tradeRef]) tradeDecisions[d.tradeRef] = [];
    tradeDecisions[d.tradeRef].push(d);
  }

  const tradeCount = Object.keys(tradeDecisions).length || 1;
  let correctTrades = 0;

  for (const [tradeRef, decisions] of Object.entries(tradeDecisions)) {
    // The last decision for the trade determines correctness
    const lastDecision = decisions[decisions.length - 1];
    if (lastDecision.isCorrect) correctTrades++;
  }

  return Math.round((correctTrades / tradeCount) * 100);
}

function calculateAttentionToDetail(workflowAnalysis, decisionAnalysis, learningEvents) {
  let score = 100;

  // Penalty for skipped steps (suggests rushing/inattention)
  if (workflowAnalysis?.totalStepsSkipped > 0) {
    score -= Math.min(30, workflowAnalysis.totalStepsSkipped * 5);
  }

  // Penalty for incorrect decisions on break trades
  if (decisionAnalysis?.decisions) {
    const incorrectOnBreaks = decisionAnalysis.decisions.filter(d =>
      !d.isCorrect && d.expectedDecision === "RAISE_BREAK"
    ).length;
    score -= incorrectOnBreaks * 10;
  }

  // Penalty for repeated mistakes
  if (learningEvents && learningEvents.length > 0) {
    const repeats = learningEvents.filter(e => (e.metadata?.repeatCount || 0) >= 2).length;
    score -= repeats * 5;
  }

  return Math.max(0, score);
}

function calculateCommunicationScore(mailEvaluations) {
  if (!mailEvaluations || mailEvaluations.length === 0) return 0;

  const scores = mailEvaluations.map(e => e.ruleScore || e.overallScore || 0);
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

function calculateEscalationScore(decisionAnalysis, workflowAnalysis) {
  if (!decisionAnalysis?.decisions) return 100;

  // Count escalation-related decisions
  const escalations = decisionAnalysis.decisions.filter(d =>
    d.action && (d.action.includes("BREAK") || d.action.includes("ESCALAT"))
  );

  if (escalations.length === 0) return 100;

  const correct = escalations.filter(d => d.isCorrect).length;
  return Math.round((correct / escalations.length) * 100);
}

function calculateTimeManagement(timelineAnalysis) {
  if (!timelineAnalysis) return 50;

  // Benchmark: 5 minutes per trade is "good", 10+ minutes is "slow"
  const avgSeconds = timelineAnalysis.avgTimePerTrade || 0;
  const GOOD_BENCHMARK = 300;   // 5 minutes
  const SLOW_BENCHMARK = 600;   // 10 minutes

  if (avgSeconds === 0) return 50;
  if (avgSeconds <= GOOD_BENCHMARK) return 100;
  if (avgSeconds >= SLOW_BENCHMARK) return Math.max(30, 100 - Math.round((avgSeconds - SLOW_BENCHMARK) / 10));

  // Linear interpolation between GOOD and SLOW
  const ratio = (avgSeconds - GOOD_BENCHMARK) / (SLOW_BENCHMARK - GOOD_BENCHMARK);
  return Math.round(100 - (ratio * 40));  // 100 → 60 range

}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

module.exports = {
  calculateCompetencies,
  calculateOverallReadiness,
  updateProfile,
  getProfile
};
