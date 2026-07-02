// ---------------------------------
// Settlement AI Coach (V2)
// ---------------------------------

const llmService = require("./llmService");

async function generateFeedback(trade, action, isCorrect) {
  try {
    const scenario = trade.settlementScenario || {};
    
    // We construct a prompt for the LLM
    const prompt = `
    You are an AI Coaching Mentor for a Settlement Operations Analyst.
    The analyst is working on a trade with the following scenario:
    Type: ${scenario.scenarioType}
    Hidden Issue: ${scenario.hiddenIssue}
    Learning Objective: ${scenario.learningObjective}

    The analyst took the action: "${action}".
    Was this correct based on the scenario? ${isCorrect ? "Yes" : "No"}.

    Provide a short, professional coaching feedback (max 3 sentences).
    Explain why it worked or failed, the operational consequence, and a best practice.
    Do NOT simply say "Correct" or "Incorrect".
    `;

    const feedback = await llmService.generateResponse(prompt);
    return feedback;
  } catch (error) {
    console.error("AI Coach Error:", error);
    return isCorrect 
      ? "Good job. This resolves the issue and allows settlement to proceed." 
      : "That action does not address the root cause of the settlement issue.";
  }
}

module.exports = {
  generateFeedback
};
