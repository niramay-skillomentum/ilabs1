// ======================================
// RECOMMENDATION ENGINE
// Generates deterministic coaching recommendations
// based on analysis results. Zero AI.
//
// Rules-based mapping from analysis outputs to
// actionable recommendations, ordered by priority.
// ======================================

/**
 * Generate recommendations based on all analysis results.
 *
 * @param {Object} params
 * @param {Object} params.workflowAnalysis
 * @param {Object} params.decisionAnalysis
 * @param {Object} params.competencyScores
 * @param {Object} params.mailAnalysis - aggregated mail analysis
 * @param {Object} params.timelineAnalysis
 * @param {Object[]} params.repeatedMistakes
 * @param {Object} params.benchmarkComparison
 * @returns {string[]} Ordered list of recommendations
 */
function generateRecommendations({
  workflowAnalysis,
  decisionAnalysis,
  competencyScores,
  mailAnalysis,
  timelineAnalysis,
  repeatedMistakes,
  benchmarkComparison
}) {
  const recommendations = [];

  // ── Critical Issues (Priority 1) ──

  if (decisionAnalysis?.highRiskErrors > 0) {
    recommendations.push(
      `CRITICAL: ${decisionAnalysis.highRiskErrors} high-risk decision error(s) detected. ` +
      `Always verify mismatches against truth data before validating or approving a trade. ` +
      `This would result in financial loss in a production environment.`
    );
  }

  if (decisionAnalysis?.accuracy < 50) {
    recommendations.push(
      `Decision accuracy is ${decisionAnalysis.accuracy}% — significantly below the 85% target. ` +
      `Review the difference between clean and break trades. Practice identifying discrepancies ` +
      `before taking action.`
    );
  }

  // ── Workflow Issues (Priority 2) ──

  if (workflowAnalysis?.overallCompliance < 60) {
    recommendations.push(
      `Workflow compliance is ${workflowAnalysis.overallCompliance}% — well below the 80% target. ` +
      `Focus on following the complete workflow for each trade type. ` +
      `Skipping steps like audit review and SSI verification creates operational risk.`
    );
  } else if (workflowAnalysis?.overallCompliance < 80) {
    recommendations.push(
      `Workflow compliance is ${workflowAnalysis.overallCompliance}%. ` +
      `Target 80%+ by ensuring you complete all expected steps in order.`
    );
  }

  if (workflowAnalysis?.totalStepsSkipped > 5) {
    recommendations.push(
      `${workflowAnalysis.totalStepsSkipped} workflow steps were skipped across your session. ` +
      `Each step exists for a reason — skipping audit reviews or verification checks ` +
      `can lead to undetected errors.`
    );
  }

  // ── Repeated Mistakes (Priority 3) ──

  if (repeatedMistakes && repeatedMistakes.length > 0) {
    const topMistakes = repeatedMistakes.slice(0, 3);
    for (const mistake of topMistakes) {
      recommendations.push(
        `Repeated mistake: "${mistake.title}" occurred ${mistake.count} time(s). ` +
        `Review the learning material for this topic to break the pattern.`
      );
    }
  }

  // ── Communication (Priority 4) ──

  if (mailAnalysis?.avgScore < 50) {
    recommendations.push(
      `Email communication quality is ${mailAnalysis.avgScore}% — needs significant improvement. ` +
      `Ensure every email includes: trade reference, clear action requested, professional tone, ` +
      `and a proper signature.`
    );
  } else if (mailAnalysis?.avgScore < 70) {
    recommendations.push(
      `Email quality is ${mailAnalysis.avgScore}%. Common issues: ` +
      `${mailAnalysis.weakRules?.map(r => r.name).join(", ") || "various structural elements"}. ` +
      `Review the email guidelines for operational communication.`
    );
  }

  if (mailAnalysis?.weakRules?.length > 0) {
    const weakNames = mailAnalysis.weakRules.map(r => r.name);
    if (weakNames.includes("Trade Reference")) {
      recommendations.push(
        `Always include the trade reference (e.g., TRD000182) in your emails. ` +
        `This is mandatory for audit traceability.`
      );
    }
    if (weakNames.includes("Action Requested")) {
      recommendations.push(
        `Clearly state what action you need from the recipient. ` +
        `Use phrases like "Please confirm" or "Kindly amend".`
      );
    }
  }

  // ── Time Management (Priority 5) ──

  if (competencyScores?.timeManagement < 50) {
    recommendations.push(
      `Time management score is ${competencyScores.timeManagement}%. ` +
      `Average time per trade is significantly above benchmark. ` +
      `Practice processing trades more efficiently while maintaining accuracy.`
    );
  }

  if (timelineAnalysis?.idleCount > 3) {
    recommendations.push(
      `${timelineAnalysis.idleCount} idle periods detected (>2 minutes of inactivity). ` +
      `Try to maintain consistent activity throughout your session.`
    );
  }

  if (timelineAnalysis?.rushCount > 10) {
    recommendations.push(
      `${timelineAnalysis.rushCount} rapid actions detected (<15 seconds between actions). ` +
      `Rushing through trades increases the risk of missing important details.`
    );
  }

  // ── Competency-Specific (Priority 6) ──

  if (competencyScores?.attentionToDetail < 70) {
    recommendations.push(
      `Attention to detail score is ${competencyScores.attentionToDetail}%. ` +
      `Take extra time to review all fields before validating. ` +
      `Compare booking data against the audit trail systematically.`
    );
  }

  if (competencyScores?.escalationJudgment < 70) {
    recommendations.push(
      `Escalation judgment score is ${competencyScores.escalationJudgment}%. ` +
      `Ensure you only raise breaks when genuine discrepancies exist, ` +
      `and always raise them when discrepancies are present.`
    );
  }

  // ── Positive Reinforcement ──

  if (decisionAnalysis?.accuracy >= 95) {
    recommendations.push(
      `Excellent decision accuracy at ${decisionAnalysis.accuracy}%. ` +
      `Consider advancing to more complex scenarios to continue your development.`
    );
  }

  if (workflowAnalysis?.overallCompliance >= 95) {
    recommendations.push(
      `Outstanding workflow discipline at ${workflowAnalysis.overallCompliance}%. ` +
      `Your systematic approach is exactly what is expected in production operations.`
    );
  }

  // ── Learning Plan Suggestion ──

  if (recommendations.length > 3) {
    recommendations.push(
      `Suggested focus areas for your next session: ` +
      `${getTopFocusAreas(competencyScores).join(", ")}.`
    );
  }

  return recommendations;
}

/**
 * Get the top 3 lowest-scoring competency areas as focus suggestions.
 */
function getTopFocusAreas(competencyScores) {
  if (!competencyScores) return ["General practice"];

  const sorted = Object.entries(competencyScores)
    .filter(([_, score]) => typeof score === "number" && score > 0)
    .sort(([, a], [, b]) => a - b);

  return sorted.slice(0, 3).map(([key]) =>
    key.replace(/([A-Z])/g, " $1").trim()
  );
}

/**
 * Determine readiness level based on competency scores.
 */
function assessReadiness(competencyScores, decisionAnalysis) {
  const overallAvg = Object.values(competencyScores)
    .filter(v => typeof v === "number" && v > 0)
    .reduce((sum, v, _, arr) => sum + v / arr.length, 0);

  const criticalErrors = decisionAnalysis?.highRiskErrors || 0;

  if (overallAvg >= 90 && criticalErrors === 0) return { level: "PRODUCTION_READY", label: "Ready for Production", color: "#22c55e" };
  if (overallAvg >= 80 && criticalErrors <= 1) return { level: "ADVANCED", label: "Advanced — Near Production Ready", color: "#84cc16" };
  if (overallAvg >= 65) return { level: "INTERMEDIATE", label: "Intermediate — Needs More Practice", color: "#f59e0b" };
  if (overallAvg >= 50) return { level: "DEVELOPING", label: "Developing — Guided Practice Required", color: "#f97316" };
  return { level: "BEGINNER", label: "Beginner — Fundamental Training Required", color: "#ef4444" };
}

module.exports = {
  generateRecommendations,
  assessReadiness,
  getTopFocusAreas
};
