// ---------------------------------
// Settlement Executor (V2)
// ---------------------------------

const AICoach = require("./settlementAICoach");

async function executeSettlement(trade) {
  const method = trade.settlementScenario?.settlementMethod || "Electronic";
  
  let outcome = "";
  let success = false;

  // We assume that if it reached execution and it's READY_TO_SETTLE (issue resolved)
  // or if they force it when it's just READY.
  
  // Check if scenario was actually completed
  if (trade.settlementScenario && !trade.scenarioCompleted) {
    // They tried to settle without resolving the issue!
    success = false;
    outcome = "Settlement failed due to unresolved issue: " + trade.settlementScenario.hiddenIssue;
    trade.settlementOperationalStatus = "FAILED_SETTLEMENT";
  } else {
    success = true;
    outcome = "Settlement completed successfully.";
    trade.settlementOperationalStatus = "COMPLETED";
    // Also move global business status
    trade.currentStatus = "SETTLED";
  }

  let platformResponse = method === "Electronic" 
    ? "Platform Simulation: " + (success ? "ACCEPTED" : "REJECTED")
    : "Counterparty: " + (success ? "CONFIRMED" : "REJECTED");

  const feedback = await AICoach.generateFeedback(trade, "Execute Settlement", success);

  return {
    success,
    outcome,
    platformResponse,
    newStatus: trade.settlementOperationalStatus,
    aiFeedback: feedback
  };
}

module.exports = {
  executeSettlement
};
