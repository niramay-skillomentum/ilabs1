// ======================================
// CPTY AI PERSONA (HYBRID: GEMINI + OFFLINE FALLBACK)
// Tries Gemini LLM first for natural responses.
// Falls back to the offline engine if Gemini is
// unavailable, rate-limited, or too slow.
// ======================================

const llmService = require("./llmService");
const offlineResponseEngine = require("./offlineResponseEngine");
const truthEngine = require("./truthEngine");

// ======================================
// GEMINI SYSTEM PROMPT FOR CPTY
// ======================================
function buildCPTYSystemPrompt(trade, parsedIntent) {
  const cptyRound = trade.cptyContactCount || 1;
  const targetDeskTruth = cptyRound > 1 ? "universal" : "confirmation";

  const scenario = truthEngine.getScenario(trade.tradeRef) || {};
  const refCheck = truthEngine.verifyReference(trade.tradeRef);
  const payment = truthEngine.checkPaymentReceived(trade.tradeRef);
  const ssi = truthEngine.verifySSI(trade.tradeRef);
  
  const confirmMismatches = truthEngine.getConfirmationMismatches(trade, targetDeskTruth);

  let context = `You are a Counterparty Operations professional replying to a bank's Middle Office.
You are responding about Trade ${trade.tradeRef}.
`;

  if (confirmMismatches && confirmMismatches.length > 0) {
    context += `\nKNOWN DISCREPANCIES (YOU MUST REFER TO THESE EXACT EXPECTED VALUES):`;
    confirmMismatches.forEach(m => {
      context += `\n- Field [${m.field}]: Bank booking shows ${m.tradeValue}, but WE EXPECT ${m.cptyExpected}.`;
    });
    if (cptyRound > 1) {
      context += `\n(Note: You double-checked your internal records and the discrepancy remains. Stay firm on your expected values.)`;
    }
  } else if (scenario.breakType) {
    context += `\nKNOWN BREAK TYPE: ${scenario.breakType}`;
  } else {
    context += `\nNO KNOWN BREAKS on this trade. Everything matches our records.`;
    if (cptyRound > 1) {
      context += `\n(Note: You previously raised a discrepancy, but upon double-checking you realize you were mistaken and the bank's booking is correct. Apologize for the confusion and confirm the trade.)`;
    }
  }

  if (payment) {
    context += `\nPayment Received: ${payment.paymentReceived ? "Yes" : "No"}`;
  }
  if (ssi) {
    context += `\nSSI Correct: ${ssi.correct ? "Yes" : "No"}`;
    if (!ssi.correct) context += ` (Correct SSI: ${ssi.correctSSI})`;
  }
  if (refCheck) {
    context += `\nReference Correct: ${refCheck.correct ? "Yes" : "No"}`;
  }

  if (parsedIntent && parsedIntent.intent) {
    context += `\nParsed User Intent: ${parsedIntent.intent}`;
  }

  context += `

RULES:
- Reply professionally, like a real counterparty operations desk would in an Outlook email.
- Provide factual answers based on the data above.
- If there are known discrepancies, explicitly state what your records expect (the WE EXPECT values).
- If the user's query is vague or just a greeting, ask for clarification.
- Keep responses concise (2-5 sentences).
- Do NOT invent issues or numbers that don't exist in the data above.
- Sign off with a realistic name and title.

Respond in this JSON format:
{
  "action": "IMMEDIATE_ANSWER",
  "subject": "RE: Trade Inquiry",
  "body": "<your email body>"
}`;

  return context;
}

// ======================================
// MAIN RESPONSE GENERATOR (HYBRID)
// ======================================
async function generateResponse(parsedIntent, tradeRef, userMessage) {

  // ── ATTEMPT 1: Gemini LLM ──
  try {
    const Trade = require("../models/Trade");
    const trade = await Trade.findOne({ tradeRef });
    const systemPrompt = buildCPTYSystemPrompt(trade, parsedIntent);
    const geminiResult = await llmService.generateResponse(systemPrompt, userMessage);

    if (geminiResult && geminiResult.body) {
      console.log("✅ CPTY Response: Gemini LLM succeeded for", tradeRef);
      return geminiResult;
    }
  } catch (err) {
    console.warn("⚠️ CPTY Gemini failed, falling back to offline engine:", err.message);
  }

  // ── ATTEMPT 2: Offline Engine (guaranteed) ──
  console.log("🔄 CPTY Response: Using offline engine for", tradeRef);
  return offlineResponseEngine.generateCPTYResponseOffline(parsedIntent, tradeRef, userMessage);
}

module.exports = {
  generateResponse
};