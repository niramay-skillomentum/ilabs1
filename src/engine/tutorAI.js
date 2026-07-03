/**
 * AI Tutor using OpenRouter (Nvidia Nemotron 3 Ultra)
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const fs = require('fs');
const path = require('path');

async function generateTutorResponse(message, desk, tradeContext, chatHistory = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in the environment variables.");
  }

  // Dynamically load docs to ensure tutor knows the simulation business rules
  let workflowGuide = "";
  let screenGuide = "";
  let faqGuide = "";
  try {
    workflowGuide = fs.readFileSync(path.join(process.cwd(), 'docs', 'skb', 'simulator_workflow_guide.md'), 'utf8');
    screenGuide = fs.readFileSync(path.join(process.cwd(), 'docs', 'skb', 'screen_and_feature_guide.md'), 'utf8');
    faqGuide = fs.readFileSync(path.join(process.cwd(), 'docs', 'skb', 'troubleshooting_and_faqs.md'), 'utf8');
  } catch (err) {
    console.error("Could not load SKB docs for tutor prompt:", err);
  }

  // Build the system prompt
  const systemPrompt = `You are a senior operations manager at a global investment bank. You are currently training a new hire on the ${desk} desk inside the iLabs Operations Simulator.
Your job is to answer their questions, provide context, and guide them on how to handle trades WITHIN THE RULES OF THIS SIMULATOR. Do NOT give them generic real-world advice if it contradicts the simulator's specific business rules.

CRITICAL RULES:
1. NEVER give them the direct answer to a problem (e.g., do not say "The mismatch is in the amount"). Instead, guide them: "Have you checked the amounts match?"
2. Keep your answers concise, practical, and conversational.
3. Base your knowledge strictly on the Simulator Knowledge Base (SKB) provided below. 
4. Always explain the simulator workflow over real-world banking process.
5. The FAQs provided below are examples of simulator behavior; you should be capable of answering other similar questions based on the logic described in the guides.

--- SIMULATOR WORKFLOW GUIDE ---
${workflowGuide}

--- SCREEN & FEATURE GUIDE ---
${screenGuide}

--- TROUBLESHOOTING & FAQs ---
${faqGuide}

Current Trade Context (if applicable):
${tradeContext ? JSON.stringify(tradeContext, null, 2) : "No specific trade selected."}
`;

  // Format history for OpenRouter endpoint
  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text
    })),
    { role: "user", content: message }
  ];

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000", // Optional for rankings
        "X-Title": "iLabs Operations Simulator" // Optional for rankings
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-ultra-550b-a55b:free",
        messages: messages,
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", response.status, errorText);
      throw new Error(`OpenRouter API responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error("Error generating tutor response via OpenRouter:", error);
    throw error;
  }
}

module.exports = {
  generateTutorResponse
};
