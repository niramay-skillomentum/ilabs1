// ======================================
// WORKFLOW ANALYZER
// Compares expected vs actual workflow per trade.
// Zero AI — purely deterministic rule-based analysis.
//
// Uses the trade's desk, type, break scenario, and truth
// data to determine what the analyst SHOULD have done,
// then compares against what they ACTUALLY did (from
// PerformanceEvents).
// ======================================

// ── Expected Workflow Definitions ──
// Each desk + scenario combination has a defined sequence of expected steps.
// These are the "gold standard" workflows that a competent analyst follows.

const EXPECTED_WORKFLOWS = {

  // ── MO DESK ──
  MO: {
    CLEAN: [
      "VIEW_AUDIT",
      "VALIDATE_TRADE"
    ],
    BREAK: [
      "VIEW_AUDIT",
      "RAISE_BREAK",
      "CONTACT_FO",
      "REVIEW_FO_RESPONSE",
      "APPLY_AMENDMENT",
      "VALIDATE_TRADE"
    ],
    BREAK_OPEN: [
      "VIEW_AUDIT",
      "CONTACT_FO",
      "REVIEW_FO_RESPONSE",
      "APPLY_AMENDMENT",
      "VALIDATE_TRADE"
    ],
    PENDING_FO_RESPONSE: [
      "VIEW_AUDIT",
      "REVIEW_FO_RESPONSE",
      "APPLY_AMENDMENT",
      "VALIDATE_TRADE"
    ]
  },

  // ── CONFIRMATION DESK ──
  CONFIRMATION: {
    CLEAN: [
      "OPEN_TRADE",
      "VIEW_AUDIT",
      "CHECK_ECONOMICS",
      "VALIDATE_TRADE",
      "ADD_COMMENT",
      "FORWARD_TO_SETTLEMENT"
    ],
    BREAK: [
      "OPEN_TRADE",
      "VIEW_AUDIT",
      "CHECK_ECONOMICS",
      "IDENTIFY_MISMATCH",
      "RAISE_BREAK",
      "ADD_COMMENT",
      "CONTACT_CPTY",
      "REVIEW_CPTY_RESPONSE",
      "APPLY_AMENDMENT",
      "VALIDATE_TRADE",
      "FORWARD_TO_SETTLEMENT"
    ],
    BREAK_WITH_FO: [
      "OPEN_TRADE",
      "VIEW_AUDIT",
      "CHECK_ECONOMICS",
      "IDENTIFY_MISMATCH",
      "RAISE_BREAK",
      "ADD_COMMENT",
      "CONTACT_CPTY",
      "REVIEW_CPTY_RESPONSE",
      "ESCALATE_TO_FO",
      "REVIEW_FO_RESPONSE",
      "APPLY_AMENDMENT",
      "VALIDATE_TRADE",
      "FORWARD_TO_SETTLEMENT"
    ]
  },

  // ── SETTLEMENT DESK ──
  SETTLEMENT: {
    CLEAN_BUY: [
      "OPEN_TRADE",
      "VIEW_AUDIT",
      "VERIFY_SSI",
      "ADD_COMMENT",
      "APPROVE_TRADE"
    ],
    CLEAN_SELL_BILATERAL: [
      "OPEN_TRADE",
      "VIEW_AUDIT",
      "READ_CPTY_MAIL",
      "VERIFY_SSI",
      "SEND_SSI_TO_CPTY",
      "AWAIT_CPTY_ACK",
      "ADD_COMMENT",
      "APPROVE_TRADE"
    ],
    CLEAN_SELL_ELECTRONIC: [
      "OPEN_TRADE",
      "VIEW_AUDIT",
      "VERIFY_SSI",
      "ADD_COMMENT",
      "APPROVE_TRADE"
    ],
    BREAK: [
      "OPEN_TRADE",
      "VIEW_AUDIT",
      "VERIFY_SSI",
      "IDENTIFY_MISMATCH",
      "RAISE_BREAK",
      "ADD_COMMENT",
      "CONTACT_CPTY",
      "REVIEW_CPTY_RESPONSE",
      "REQUEST_AMENDMENT",
      "APPROVE_TRADE"
    ],
    CUTOFF_BREAK: [
      "OPEN_TRADE",
      "VIEW_AUDIT",
      "READ_SYSTEM_MAIL",
      "VERIFY_SSI",
      "CONTACT_CPTY",
      "REVIEW_CPTY_RESPONSE",
      "REQUEST_AMENDMENT",
      "APPROVE_TRADE"
    ]
  },

  // ── RECONCILIATION DESK ──
  RECONCILIATION: {
    CLEAN: [
      "OPEN_TRADE",
      "VIEW_LEDGER",
      "MATCH_ENTRIES",
      "VALIDATE_MATCH",
      "CLEAR_ITEM"
    ],
    BREAK: [
      "OPEN_TRADE",
      "VIEW_LEDGER",
      "IDENTIFY_DISCREPANCY",
      "INVESTIGATE_BREAK",
      "ADD_COMMENT",
      "RESOLVE_BREAK",
      "CLEAR_ITEM"
    ]
  }
};

// ── Event-to-Step Mapping ──
// Maps PerformanceEvent.eventType / metadata.action to workflow step names.
const EVENT_TO_STEP = {
  // Audit events
  "TRADE_OPENED": "OPEN_TRADE",
  "AUDIT_VIEWED": "VIEW_AUDIT",
  "AUDIT_RECORDED": null,                // Internal, not a user step

  // Validation events
  "VALIDATION_ATTEMPT": "VALIDATE_TRADE",
  "VALIDATE": "VALIDATE_TRADE",
  "VALIDATE_CLEAN": "VALIDATE_TRADE",
  "VALIDATE_BREAK": "VALIDATE_TRADE",

  // Break events
  "BREAK_RAISED": "RAISE_BREAK",
  "RAISE_BREAK": "RAISE_BREAK",
  "MO_BREAK_OPEN": "RAISE_BREAK",
  "CONFIRMATION_BREAK": "RAISE_BREAK",
  "SETTLEMENT_BREAK": "RAISE_BREAK",

  // Communication
  "MAIL_SENT": "CONTACT_CPTY",
  "MAIL_READ": "READ_CPTY_MAIL",
  "FO_CONTACTED": "CONTACT_FO",
  "FO_ESCALATED": "ESCALATE_TO_FO",

  // Amendments
  "AMENDMENT_APPLIED": "APPLY_AMENDMENT",
  "AMENDMENT_REQUESTED": "REQUEST_AMENDMENT",

  // Forwarding / Approving
  "TRADE_FORWARDED": "FORWARD_TO_CONFIRMATION",
  "FORWARD_TO_SETTLEMENT": "FORWARD_TO_SETTLEMENT",
  "TRADE_APPROVED": "APPROVE_TRADE",
  "APPROVE": "APPROVE_TRADE",

  // SSI
  "SSI_VERIFIED": "VERIFY_SSI",
  "SSI_SENT": "SEND_SSI_TO_CPTY",

  // Settlement
  "TRADE_SETTLED": "TRADE_SETTLED",
  "TRADE_CLOSED": "TRADE_CLOSED",

  // Comments
  "COMMENT_ADDED": "ADD_COMMENT",

  // Booking
  "BOOKING_CHECKED": "CHECK_BOOKING",
  "ECONOMICS_CHECKED": "CHECK_ECONOMICS",

  // Learning
  "LEARNING_EVENT": null,
  "TUTOR_OPENED": null,

  // Reconciliation
  "LEDGER_VIEWED": "VIEW_LEDGER",
  "ENTRIES_MATCHED": "MATCH_ENTRIES",
  "MATCH_VALIDATED": "VALIDATE_MATCH",
  "ITEM_CLEARED": "CLEAR_ITEM",
  "DISCREPANCY_IDENTIFIED": "IDENTIFY_DISCREPANCY",
  "BREAK_INVESTIGATED": "INVESTIGATE_BREAK",
  "BREAK_RESOLVED": "RESOLVE_BREAK",

  // FO / CPTY Response events
  "FO_MAIL_READ": "REVIEW_FO_RESPONSE",
  "CPTY_MAIL_READ": "REVIEW_CPTY_RESPONSE",

  // Identify mismatch (from MO_RAISE_BREAK selecting discrepancies)
  "IDENTIFY_MISMATCH": "IDENTIFY_MISMATCH",
  "MISMATCH_IDENTIFIED": "IDENTIFY_MISMATCH"
};

/**
 * Determine the expected workflow for a trade based on its desk, type, and scenario.
 *
 * @param {Object} trade - The trade object
 * @param {string} desk - The desk (MO, CONFIRMATION, SETTLEMENT, RECONCILIATION)
 * @returns {string[]} Expected workflow steps
 */
function getExpectedWorkflow(trade, desk, initialStatus, isBreak) {
  const deskWorkflows = EXPECTED_WORKFLOWS[desk];
  if (!deskWorkflows) return ["OPEN_TRADE"];

  if (desk === "SETTLEMENT") {
    if (trade.cutoffMissedReason) return deskWorkflows.CUTOFF_BREAK;
    if (isBreak) return deskWorkflows.BREAK;
    if (trade.direction === "SELL" && trade.settlementType === "BILATERAL") return deskWorkflows.CLEAN_SELL_BILATERAL;
    if (trade.direction === "SELL") return deskWorkflows.CLEAN_SELL_ELECTRONIC;
    return deskWorkflows.CLEAN_BUY;
  }

  if (desk === "CONFIRMATION") {
    if (isBreak && trade.foEscalation?.status) return deskWorkflows.BREAK_WITH_FO;
    if (isBreak) return deskWorkflows.BREAK;
    return deskWorkflows.CLEAN;
  }

  // MO: Handle sub-scenarios based on current status
  if (desk === "MO") {
    if (initialStatus === "MO_BREAK_OPEN") return deskWorkflows.BREAK_OPEN;
    if (initialStatus === "PENDING_FO_RESPONSE") return deskWorkflows.PENDING_FO_RESPONSE;
    return isBreak ? deskWorkflows.BREAK : deskWorkflows.CLEAN;
  }

  // RECONCILIATION
  return isBreak ? deskWorkflows.BREAK : deskWorkflows.CLEAN;
}

/**
 * Determine if a trade is a break trade based on desk and truth data.
 */
function determineIsBreak(trade, desk, evaluateOriginal = false) {
  try {
    const truthEngine = require("../truthEngine");
    
    let tradeToEvaluate = trade;
    if (evaluateOriginal) {
      tradeToEvaluate = JSON.parse(JSON.stringify(trade));
      if (tradeToEvaluate.amendmentHistory && tradeToEvaluate.amendmentHistory.length > 0) {
        const history = [...tradeToEvaluate.amendmentHistory].reverse();
        for (const am of history) {
          if (tradeToEvaluate.booking && am.field) tradeToEvaluate.booking[am.field] = am.oldValue;
          if (tradeToEvaluate[am.field] !== undefined) tradeToEvaluate[am.field] = am.oldValue;
        }
      }
    }

    if (desk === "MO") {
      return truthEngine.getMismatchFields(tradeToEvaluate, "mo").length > 0;
    }
    if (desk === "CONFIRMATION") {
      return truthEngine.getConfirmationMismatches(tradeToEvaluate).length > 0;
    }
    if (desk === "SETTLEMENT") {
      return truthEngine.getSettlementMismatches(tradeToEvaluate).length > 0 ||
        trade.currentStatus === "SETTLEMENT_BREAK" ||
        trade.cutoffMissedReason != null;
    }
  } catch (e) {
    // truthEngine not available
  }

  return false;
}

/**
 * Extract the actual workflow from PerformanceEvents.
 * Maps each event to a workflow step and removes duplicates/nulls.
 *
 * @param {Object[]} events - PerformanceEvents for this trade, ordered by timestamp
 * @returns {string[]} Actual workflow steps performed
 */
function extractActualWorkflow(events) {
  const steps = [];
  const seen = new Set();

  for (const event of events) {
    // Try mapping by eventType first, then by metadata.action
    let step = EVENT_TO_STEP[event.eventType];

    if (!step && event.metadata?.action) {
      step = EVENT_TO_STEP[event.metadata.action];
    }
    
    // Add special handling for CPTY_MAIL_READ to fulfill READ_CPTY_MAIL as well
    if (event.eventType === "CPTY_MAIL_READ") {
      if (!seen.has("READ_CPTY_MAIL")) {
        steps.push("READ_CPTY_MAIL");
        seen.add("READ_CPTY_MAIL");
      }
    }

    // Also check for status transitions that map to steps
    if (!step && event.metadata?.action) {
      const action = event.metadata.action.toUpperCase();
      if (action.includes("VALIDATE")) step = "VALIDATE_TRADE";
      else if (action.includes("BREAK") && action.includes("RAISE")) step = "RAISE_BREAK";
      else if (action.includes("FORWARD") || action.includes("CONFIRMATION_PENDING")) step = "FORWARD_TO_CONFIRMATION";
      else if (action.includes("SETTLEMENT_PENDING") && !action.includes("BREAK")) step = "FORWARD_TO_SETTLEMENT";
      else if (action.includes("APPROVE")) step = "APPROVE_TRADE";
      else if (action.includes("COMMENT")) step = "ADD_COMMENT";
    }

    // Skip null mappings (internal events) and duplicates
    if (step && !seen.has(step)) {
      steps.push(step);
      seen.add(step);
    }
  }

  return steps;
}

/**
 * Analyze a single trade's workflow compliance.
 *
 * @param {Object} trade - The trade object
 * @param {Object[]} tradeEvents - PerformanceEvents for this trade
 * @param {string} desk - The desk
 * @returns {Object} Workflow analysis result
 */
function analyzeTrade(trade, tradeEvents, desk) {
  let initialStatus = trade.currentStatus;
  
  const openedEvent = tradeEvents.find(e => e.eventType === "TRADE_OPENED" && e.metadata && e.metadata.status);
  if (openedEvent) {
    initialStatus = openedEvent.metadata.status;
  } else {
    const firstActionEvent = tradeEvents.find(e => e.metadata && e.metadata.previousStatus);
    if (firstActionEvent) {
      initialStatus = firstActionEvent.metadata.previousStatus;
    }
  }

  const isBreak = determineIsBreak(trade, desk, true);
  const expectedWorkflow = getExpectedWorkflow(trade, desk, initialStatus, isBreak);
  const actualWorkflow = extractActualWorkflow(tradeEvents);

  // Calculate skipped steps (expected but not performed)
  const skippedSteps = expectedWorkflow.filter(step => !actualWorkflow.includes(step));

  // Calculate unnecessary steps (performed but not expected)
  const unnecessarySteps = actualWorkflow.filter(step => !expectedWorkflow.includes(step));

  // Calculate incorrect order (steps that exist in both but in wrong sequence)
  const incorrectOrder = [];
  const commonSteps = actualWorkflow.filter(step => expectedWorkflow.includes(step));
  for (let i = 1; i < commonSteps.length; i++) {
    const expectedIdx = expectedWorkflow.indexOf(commonSteps[i]);
    const prevExpectedIdx = expectedWorkflow.indexOf(commonSteps[i - 1]);
    if (expectedIdx < prevExpectedIdx) {
      incorrectOrder.push({
        step: commonSteps[i],
        before: commonSteps[i - 1],
        reason: `"${commonSteps[i]}" performed before "${commonSteps[i - 1]}" but should come after`
      });
    }
  }

  // Compliance: % of expected steps completed correctly
  const totalExpected = expectedWorkflow.length;
  const completedCorrectly = expectedWorkflow.filter(step => actualWorkflow.includes(step)).length;
  const orderPenalty = incorrectOrder.length * 5;  // 5% penalty per out-of-order step
  const compliancePercent = Math.max(0, Math.round(
    ((completedCorrectly / Math.max(totalExpected, 1)) * 100) - orderPenalty
  ));

  // Determine operational impact
  let operationalImpact = "None";
  if (skippedSteps.includes("VERIFY_SSI")) operationalImpact = "Settlement failure risk — SSI not verified";
  else if (skippedSteps.includes("RAISE_BREAK") && determineIsBreak(trade, desk)) operationalImpact = "Unresolved break — trade may fail downstream";
  else if (skippedSteps.includes("VIEW_AUDIT")) operationalImpact = "Incomplete due diligence — audit trail not reviewed";
  else if (skippedSteps.includes("ADD_COMMENT")) operationalImpact = "Audit gap — no documentation of action taken";
  else if (skippedSteps.length > 0) operationalImpact = `${skippedSteps.length} workflow step(s) skipped`;

  return {
    tradeRef: trade.tradeRef,
    desk,
    isBreak: isBreak,
    expectedWorkflow,
    actualWorkflow,
    skippedSteps,
    unnecessarySteps,
    incorrectOrder,
    compliancePercent,
    operationalImpact,
    totalExpectedSteps: totalExpected,
    totalActualSteps: actualWorkflow.length
  };
}

/**
 * Analyze workflow compliance across all trades in a session.
 *
 * @param {Object[]} trades - Array of trade objects
 * @param {Map} tradeEventsMap - Map of tradeRef → PerformanceEvents[]
 * @param {string} desk - The desk
 * @returns {Object} Session-wide workflow analysis
 */
function analyzeSession(trades, tradeEventsMap, desk) {
  const tradeResults = [];

  for (const trade of trades) {
    const events = tradeEventsMap.get(trade.tradeRef) || [];
    tradeResults.push(analyzeTrade(trade, events, desk));
  }

  // Session-wide aggregation
  const totalStepsExpected = tradeResults.reduce((sum, r) => sum + r.totalExpectedSteps, 0);
  const totalStepsCompleted = tradeResults.reduce((sum, r) =>
    sum + r.expectedWorkflow.filter(s => r.actualWorkflow.includes(s)).length, 0);
  const totalStepsSkipped = tradeResults.reduce((sum, r) => sum + r.skippedSteps.length, 0);
  const totalUnnecessarySteps = tradeResults.reduce((sum, r) => sum + r.unnecessarySteps.length, 0);

  const overallCompliance = tradeResults.length > 0
    ? Math.round(tradeResults.reduce((sum, r) => sum + r.compliancePercent, 0) / tradeResults.length)
    : 0;

  return {
    tradeResults,
    overallCompliance,
    totalStepsExpected,
    totalStepsCompleted,
    totalStepsSkipped,
    totalUnnecessarySteps
  };
}

module.exports = {
  analyzeTrade,
  analyzeSession,
  getExpectedWorkflow,
  extractActualWorkflow,
  determineIsBreak,
  EXPECTED_WORKFLOWS,
  EVENT_TO_STEP
};
