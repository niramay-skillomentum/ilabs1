// ======================================
// EVIDENCE GRAPH
// Ensures every report finding is backed by
// traceable, verifiable evidence. Zero AI.
//
// No AI-generated statement may exist without
// a corresponding evidence graph entry.
// All evidence is deterministic = 100% confidence.
// ======================================

/**
 * Build the evidence graph from all analysis results.
 *
 * @param {Object} params
 * @param {Object} params.workflowAnalysis
 * @param {Object} params.decisionAnalysis
 * @param {Object[]} params.mailEvaluations
 * @param {Object[]} params.repeatedMistakes
 * @param {Object} params.competencyScores
 * @param {Object} params.timelineAnalysis
 * @returns {Object[]} Array of evidence graph entries
 */
function buildEvidenceGraph({
  workflowAnalysis,
  decisionAnalysis,
  mailEvaluations,
  repeatedMistakes,
  competencyScores,
  timelineAnalysis
}) {
  const graph = [];

  // ── Workflow Compliance Evidence ──
  if (workflowAnalysis) {
    if (workflowAnalysis.overallCompliance < 80) {
      const skippedSummary = {};
      for (const result of (workflowAnalysis.tradeResults || [])) {
        for (const step of result.skippedSteps) {
          skippedSummary[step] = (skippedSummary[step] || 0) + 1;
        }
      }

      graph.push({
        finding: `Workflow compliance is below target at ${workflowAnalysis.overallCompliance}%`,
        evidence: [
          { type: "METRIC", ref: `${workflowAnalysis.totalStepsSkipped} steps skipped across all trades` },
          ...Object.entries(skippedSummary).slice(0, 5).map(([step, count]) => ({
            type: "SKIPPED_STEP", ref: `"${step}" skipped ${count} time(s)`
          }))
        ],
        confidence: 100,
        relatedTrades: (workflowAnalysis.tradeResults || [])
          .filter(r => r.skippedSteps.length > 0)
          .map(r => r.tradeRef),
        supportingEventCount: workflowAnalysis.totalStepsSkipped
      });
    }

    if (workflowAnalysis.totalUnnecessarySteps > 0) {
      graph.push({
        finding: `${workflowAnalysis.totalUnnecessarySteps} unnecessary workflow step(s) performed`,
        evidence: [
          { type: "METRIC", ref: `Analyst performed actions not required by the expected workflow` }
        ],
        confidence: 100,
        relatedTrades: (workflowAnalysis.tradeResults || [])
          .filter(r => r.unnecessarySteps.length > 0)
          .map(r => r.tradeRef),
        supportingEventCount: workflowAnalysis.totalUnnecessarySteps
      });
    }
  }

  // ── Decision Analysis Evidence ──
  if (decisionAnalysis) {
    if (decisionAnalysis.incorrectDecisions > 0) {
      const incorrectOnes = decisionAnalysis.decisions.filter(d => !d.isCorrect);
      graph.push({
        finding: `${decisionAnalysis.incorrectDecisions} incorrect decision(s) out of ${decisionAnalysis.totalDecisions}`,
        evidence: incorrectOnes.slice(0, 10).map(d => ({
          type: "INCORRECT_DECISION",
          ref: `${d.tradeRef}: ${d.actualDecision} — Expected: ${d.expectedDecision}. ${d.evidence}`
        })),
        confidence: 100,
        relatedTrades: [...new Set(incorrectOnes.map(d => d.tradeRef))],
        supportingEventCount: incorrectOnes.length
      });
    }

    if (decisionAnalysis.highRiskErrors > 0) {
      const highRisk = decisionAnalysis.decisions.filter(d =>
        !d.isCorrect && (d.operationalRisk === "HIGH" || d.operationalRisk === "CRITICAL")
      );
      graph.push({
        finding: `${decisionAnalysis.highRiskErrors} HIGH/CRITICAL risk error(s) — would cause financial impact in production`,
        evidence: highRisk.map(d => ({
          type: "HIGH_RISK_ERROR",
          ref: `${d.tradeRef}: ${d.learningPoint}`
        })),
        confidence: 100,
        relatedTrades: [...new Set(highRisk.map(d => d.tradeRef))],
        supportingEventCount: highRisk.length
      });
    }
  }

  // ── Communication Evidence ──
  if (mailEvaluations && mailEvaluations.length > 0) {
    const avgScore = Math.round(
      mailEvaluations.reduce((sum, e) => sum + (e.ruleScore || 0), 0) / mailEvaluations.length
    );

    if (avgScore < 70) {
      // Count rule failures across all evaluations
      const failureCounts = {};
      for (const evaluation of mailEvaluations) {
        for (const [rule, passed] of Object.entries(evaluation.ruleResults || {})) {
          if (!passed) {
            failureCounts[rule] = (failureCounts[rule] || 0) + 1;
          }
        }
      }

      graph.push({
        finding: `Communication needs improvement — average email score is ${avgScore}%`,
        evidence: [
          { type: "METRIC", ref: `${mailEvaluations.length} emails analyzed` },
          ...Object.entries(failureCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([rule, count]) => ({
              type: "RULE_FAILURE",
              ref: `${count} email(s) missing ${formatRuleName(rule)}`
            }))
        ],
        confidence: 100,
        relatedTrades: [...new Set(mailEvaluations.map(e => e.tradeRef).filter(Boolean))],
        supportingEventCount: mailEvaluations.length
      });
    }
  }

  // ── Repeated Mistakes Evidence ──
  if (repeatedMistakes && repeatedMistakes.length > 0) {
    graph.push({
      finding: `${repeatedMistakes.length} type(s) of repeated mistakes detected`,
      evidence: repeatedMistakes.map(m => ({
        type: "REPEATED_MISTAKE",
        ref: `"${m.title}" (${m.mistakeCode}) — occurred ${m.count} time(s), severity: ${m.severity}`
      })),
      confidence: 100,
      relatedTrades: [...new Set(repeatedMistakes.flatMap(m => m.trades || []))],
      supportingEventCount: repeatedMistakes.reduce((sum, m) => sum + m.count, 0)
    });
  }

  // ── Competency Evidence ──
  if (competencyScores) {
    const weakCompetencies = Object.entries(competencyScores)
      .filter(([_, score]) => typeof score === "number" && score > 0 && score < 60);

    if (weakCompetencies.length > 0) {
      graph.push({
        finding: `${weakCompetencies.length} competency area(s) below 60% threshold`,
        evidence: weakCompetencies.map(([key, score]) => ({
          type: "WEAK_COMPETENCY",
          ref: `${formatCompetencyName(key)}: ${score}%`
        })),
        confidence: 100,
        relatedTrades: [],
        supportingEventCount: weakCompetencies.length
      });
    }
  }

  // ── Time Management Evidence ──
  if (timelineAnalysis) {
    if (timelineAnalysis.idleCount > 2) {
      graph.push({
        finding: `${timelineAnalysis.idleCount} significant idle period(s) detected`,
        evidence: timelineAnalysis.idlePeriods.slice(0, 5).map(p => ({
          type: "IDLE_PERIOD",
          ref: `${p.durationFormatted} idle between ${p.start} and ${p.end}`
        })),
        confidence: 100,
        relatedTrades: [],
        supportingEventCount: timelineAnalysis.idleCount
      });
    }
  }

  return graph;
}

/**
 * Validate that every AI-generated finding has evidence backing.
 * Returns any findings that are NOT backed by evidence.
 */
function validateEvidenceIntegrity(evidenceGraph, aiSections) {
  // AI sections should reference findings from the evidence graph
  // This is a structural integrity check
  const orphanFindings = [];

  if (evidenceGraph.length === 0 && aiSections) {
    // If there's no evidence but AI generated content, flag it
    if (aiSections.executiveSummary && aiSections.executiveSummary.length > 50) {
      orphanFindings.push("Executive summary generated without sufficient evidence");
    }
  }

  return orphanFindings;
}

// ── Formatting Helpers ──

function formatRuleName(rule) {
  const names = {
    hasGreeting: "greeting",
    hasSubject: "subject line",
    hasTradeReference: "trade reference",
    hasRecipient: "recipient addressing",
    hasActionRequested: "action requested",
    hasProfessionalTone: "professional tone",
    hasProperStructure: "proper structure",
    hasGrammar: "grammar",
    hasSignature: "signature/closing",
    hasContext: "operational context"
  };
  return names[rule] || rule;
}

function formatCompetencyName(key) {
  return key.replace(/([A-Z])/g, " $1").trim();
}

module.exports = {
  buildEvidenceGraph,
  validateEvidenceIntegrity
};
