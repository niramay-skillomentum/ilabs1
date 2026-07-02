// ---------------------------------
// Settlement Scenario Manager (V2)
// ---------------------------------

const templates = [
  {
    scenarioId: "SSI_001",
    scenarioType: "Missing SSI",
    hiddenIssue: "The counterparty has not provided Standard Settlement Instructions.",
    expectedResolution: "Request Updated SSI",
    learningObjective: "Understand the importance of complete SSI for settlement.",
    possibleOutcomes: ["Counterparty provides SSI", "Counterparty delays response"],
    checkListModifiers: { ssiPresent: false }
  },
  {
    scenarioId: "ACCOUNT_001",
    scenarioType: "Wrong Settlement Account",
    hiddenIssue: "The settlement account specified is closed or invalid.",
    expectedResolution: "Update Account",
    learningObjective: "Learn to verify internal account statuses.",
    possibleOutcomes: ["Account updated successfully", "Insufficient funds in new account"],
    checkListModifiers: { accountValid: false }
  },
  {
    scenarioId: "FAILED_001",
    scenarioType: "Settlement Failed",
    hiddenIssue: "The settlement platform rejected the instruction due to incorrect depository.",
    expectedResolution: "Investigate Failure",
    learningObjective: "Handle exception queue and investigate platform rejections.",
    possibleOutcomes: ["Identify correct depository and retry"],
    checkListModifiers: { platformAccepted: false } // This might only trigger during execution
  },
  {
    scenarioId: "COUNTERPARTY_001",
    scenarioType: "Counterparty Changed Custodian",
    hiddenIssue: "Counterparty updated their custodian yesterday without notifying.",
    expectedResolution: "Request Updated Instructions",
    learningObjective: "Communicate with counterparty to resolve bilateral discrepancies.",
    possibleOutcomes: ["Receive updated custodian details"],
    checkListModifiers: { custodianValid: false }
  }
];

function generateScenario(difficulty = "Beginner") {
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    ...template,
    difficulty,
    settlementMethod: Math.random() > 0.5 ? "Electronic" : "Bilateral"
  };
}

function generateReadinessChecklist(trade) {
  const scenario = trade.settlementScenario || {};
  const modifiers = scenario.checkListModifiers || {};

  return [
    { label: "Trade Confirmed", status: "✓" },
    { label: "Settlement Date Valid", status: "✓" },
    { label: "Counterparty Confirmed", status: "✓" },
    { 
      label: "Settlement Instructions Present", 
      status: modifiers.ssiPresent === false ? "✗" : "✓" 
    },
    { 
      label: "Account Valid", 
      status: modifiers.accountValid === false ? "✗" : "✓" 
    },
    { 
      label: "Custodian Valid", 
      status: modifiers.custodianValid === false ? "✗" : "✓" 
    },
    { label: "Cash Available", status: "✓" }
  ];
}

function validateAction(trade, userAction) {
  const expected = trade.settlementScenario?.expectedResolution;
  return {
    correct: userAction === expected,
    expectedAction: expected
  };
}

module.exports = {
  generateScenario,
  generateReadinessChecklist,
  validateAction,
  templates
};
