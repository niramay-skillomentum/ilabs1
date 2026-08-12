// ======================================
// DECISION ANALYZER
// Evaluates every user decision against the truth.
// Zero AI — purely deterministic comparison.
//
// For each decision event (VALIDATE, RAISE_BREAK,
// APPROVE, FORWARD), determines if the decision was
// correct given the truth data, and assigns an
// operational risk level.
// ======================================

/**
 * Analyze all decisions for a single trade.
 *
 * @param {Object} trade - The trade object with truths
 * @param {Object[]} tradeEvents - PerformanceEvents for this trade
 * @param {string} desk - The desk
 * @returns {Object[]} Array of decision analysis results
 */
function analyzeTradeDecisions(trade, tradeEvents, desk) {
  const decisions = [];

  for (const event of tradeEvents) {
    if (event.eventType === "AUDIT_RECORDED" || event.eventType === "COMMENT_ADDED") continue;

    const action = event.metadata?.action || event.eventType;
    if (!isDecisionEvent(action)) continue;

    // Determine the ground truth for this specific action
    const isBreak = determineBreakStatus(trade, desk, action);
    const mismatches = getMismatchInfo(trade, desk, action);

    const analysis = analyzeDecision(action, trade, isBreak, mismatches, desk, event);
    if (analysis) {
      decisions.push(analysis);
    }
  }

  return decisions;
}

/**
 * Check if an event represents a user decision.
 */
function isDecisionEvent(action) {
  if (!action) return false;
  const a = action.toUpperCase();
  return (
    a.includes("VALIDATE") ||
    a.includes("RAISE_BREAK") || a.includes("BREAK_RAISED") ||
    a.includes("APPROVE") ||
    a.includes("FORWARD") ||
    a.includes("CONFIRMATION_PENDING") ||
    a.includes("SETTLEMENT_PENDING") ||
    a.includes("MO_BREAK_OPEN") ||
    a.includes("CONFIRMATION_BREAK") ||
    a.includes("SETTLEMENT_BREAK")
  );
}

/**
 * Analyze a single decision against truth.
 */
function analyzeDecision(action, trade, isBreak, mismatches, desk, event) {
  const a = (action || "").toUpperCase();
  let isCorrect = false;
  let expectedDecision = "";
  let evidence = "";
  let operationalRisk = "LOW";
  let learningPoint = "";

  // ── VALIDATE / FORWARD (user says "this trade is clean") ──
  if (a.includes("VALIDATE") || a.includes("FORWARD") || a.includes("CONFIRMATION_PENDING") || a.includes("SETTLEMENT_PENDING")) {
    if (isBreak) {
      // User validated/forwarded a BREAK trade → INCORRECT
      isCorrect = false;
      expectedDecision = "RAISE_BREAK";
      evidence = `Trade has ${mismatches.length} mismatch(es): ${mismatches.map(m => m.field || m).join(", ")}`;
      operationalRisk = mismatches.length > 1 ? "CRITICAL" : "HIGH";
      learningPoint = `A break existed but was not identified. ${getImpactDescription(desk, mismatches)}`;
    } else {
      // User validated/forwarded a CLEAN trade → CORRECT
      isCorrect = true;
      expectedDecision = "VALIDATE";
      evidence = "No mismatches found between booking and truth data.";
      operationalRisk = "NONE";
      learningPoint = "Correctly identified a clean trade and moved it forward.";
    }
  }

  // ── RAISE BREAK (user says "this trade has an issue") ──
  else if (a.includes("BREAK") && (a.includes("RAISE") || a.includes("MO_BREAK") || a.includes("CONFIRMATION_BREAK") || a.includes("SETTLEMENT_BREAK"))) {
    if (isBreak) {
      // User raised a break on a BREAK trade → CORRECT
      isCorrect = true;
      expectedDecision = "RAISE_BREAK";
      evidence = `Trade has ${mismatches.length} mismatch(es): ${mismatches.map(m => m.field || m).join(", ")}`;
      operationalRisk = "NONE";
      learningPoint = "Correctly identified the break and escalated for resolution.";
    } else {
      // User raised a break on a CLEAN trade → INCORRECT
      isCorrect = false;
      expectedDecision = "VALIDATE";
      evidence = "No mismatches exist — trade was clean.";
      operationalRisk = "MEDIUM";
      learningPoint = "Raised a break on a clean trade. This would cause unnecessary delays and workload.";
    }
  }

  // ── APPROVE (settlement approval) ──
  else if (a.includes("APPROVE")) {
    if (isBreak && mismatches.length > 0) {
      // Approved a trade with unresolved mismatches → INCORRECT
      isCorrect = false;
      expectedDecision = "RAISE_BREAK or REQUEST_AMENDMENT";
      evidence = `SSI/settlement mismatches still present: ${mismatches.map(m => m.field || m).join(", ")}`;
      operationalRisk = "CRITICAL";
      learningPoint = "Approved without verifying settlement instructions. Would likely result in settlement failure.";
    } else {
      isCorrect = true;
      expectedDecision = "APPROVE";
      evidence = "All settlement details match verified instructions.";
      operationalRisk = "NONE";
      learningPoint = "Correctly approved a trade with valid settlement details.";
    }
  }

  else {
    return null; // Not a recognized decision type
  }

  return {
    tradeRef: trade.tradeRef,
    action: action,
    timestamp: event.timestamp,
    isCorrect,
    expectedDecision,
    actualDecision: action,
    evidence,
    operationalRisk,
    learningPoint
  };
}

/**
 * Get mismatch information for a trade on a specific desk.
 */
function getMismatchInfo(trade, desk, action = "") {
  try {
    const truthEngine = require("../truthEngine");

    // If the action is raising a break, we should check if the trade was ORIGINALLY a break.
    // Reconstruct the trade by reverting any amendments that might have fixed the break.
    let tradeToEvaluate = trade;
    const a = (action || "").toUpperCase();
    if (a.includes("BREAK")) {
      tradeToEvaluate = JSON.parse(JSON.stringify(trade));
      if (tradeToEvaluate.amendmentHistory && tradeToEvaluate.amendmentHistory.length > 0) {
        // Revert amendments in reverse chronological order, but ONLY those made by the current desk
        const history = [...tradeToEvaluate.amendmentHistory].reverse();
        for (const am of history) {
          if (!am.desk || am.desk.toUpperCase() === desk.toUpperCase()) {
            if (tradeToEvaluate.booking && am.field) tradeToEvaluate.booking[am.field] = am.oldValue;
            if (tradeToEvaluate[am.field] !== undefined) tradeToEvaluate[am.field] = am.oldValue;
          }
        }
      }
    }

    if (desk === "MO") {
      const fields = truthEngine.getMismatchFields(tradeToEvaluate, "mo");
      return fields.map(f => ({ field: f, tradeValue: tradeToEvaluate.booking?.[f], truthValue: tradeToEvaluate.truths?.mo?.[f] }));
    }
    if (desk === "CONFIRMATION") {
      return truthEngine.getConfirmationMismatches(tradeToEvaluate);
    }
    if (desk === "SETTLEMENT") {
      return truthEngine.getSettlementMismatches(tradeToEvaluate);
    }
  } catch (e) {
    // truthEngine not available
  }
  return [];
}

/**
 * Determine if a trade is a break based on truth data.
 */
function determineBreakStatus(trade, desk, action = "") {
  const mismatches = getMismatchInfo(trade, desk, action);
  if (mismatches.length > 0) return true;

  // Also check status-based breaks
  if (trade.currentStatus === "SETTLEMENT_BREAK" || trade.cutoffMissedReason) return true;

  return false;
}

/**
 * Get a human-readable impact description.
 */
function getImpactDescription(desk, mismatches) {
  if (desk === "SETTLEMENT") {
    return "Approving with incorrect SSI would result in a failed payment or misdirected funds.";
  }
  if (desk === "CONFIRMATION") {
    return "Forwarding an unconfirmed break would propagate the error to settlement.";
  }
  return "Forwarding with unresolved discrepancies creates downstream operational risk.";
}

/**
 * Aggregate decision analysis across all trades in a session.
 *
 * @param {Object[]} allDecisions - Flat array of all decision analyses
 * @returns {Object} Aggregated decision analysis
 */
function aggregateDecisions(allDecisions) {
  const totalDecisions = allDecisions.length;
  const correctDecisions = allDecisions.filter(d => d.isCorrect).length;
  const incorrectDecisions = totalDecisions - correctDecisions;
  const accuracy = totalDecisions > 0 ? Math.round((correctDecisions / totalDecisions) * 100) : 100;

  const highRiskErrors = allDecisions.filter(d =>
    !d.isCorrect && (d.operationalRisk === "HIGH" || d.operationalRisk === "CRITICAL")
  ).length;

  return {
    totalDecisions,
    correctDecisions,
    incorrectDecisions,
    accuracy,
    highRiskErrors,
    decisions: allDecisions
  };
}

module.exports = {
  analyzeTradeDecisions,
  aggregateDecisions,
  determineBreakStatus,
  getMismatchInfo
};
