// ---------------------------------
// Settlement Engine (V2)
// ---------------------------------

const ScenarioManager = require("./settlementScenarioManager");
const AICoach = require("./settlementAICoach");

// Time cost in minutes for actions
const ACTION_TIMES = {
  "Investigate": 10,
  "Reply": 5,
  "Settle": 2,
  "Update Account": 5,
  "Request Updated SSI": 5,
  "Request Updated Instructions": 5
};

async function logDecision(trade, action, decision, correctness, impact, aiFeedback) {
  const timeConsumed = ACTION_TIMES[action] || 5;
  
  if (!trade.decisionLogs) {
    trade.decisionLogs = [];
  }
  
  trade.decisionLogs.push({
    timestamp: new Date(),
    action,
    decision,
    correctness,
    operationalImpact: impact,
    scenarioStage: trade.settlementOperationalStatus,
    aiFeedback,
    simulatedTimeConsumed: timeConsumed
  });
  
  // We can return timeConsumed to inform the frontend
  return timeConsumed;
}

async function processUserDecision(trade, action, decision) {
  // Validate if the action was correct based on scenario
  const validation = ScenarioManager.validateAction(trade, action);
  
  // Call AI Coach for feedback
  const feedback = await AICoach.generateFeedback(trade, action, validation.correct);
  
  // Update state based on action
  let impact = "Action logged.";
  if (validation.correct) {
    trade.settlementOperationalStatus = "READY_TO_SETTLE";
    impact = "Issue resolved, trade is ready for settlement.";
    trade.scenarioCompleted = true;
  } else {
    // Mistake made
    impact = "Incorrect action taken, causing delays.";
  }
  
  await logDecision(trade, action, decision, validation.correct, impact, feedback);
  
  return {
    success: validation.correct,
    message: impact,
    aiFeedback: feedback,
    newStatus: trade.settlementOperationalStatus
  };
}

module.exports = {
  logDecision,
  processUserDecision
};
