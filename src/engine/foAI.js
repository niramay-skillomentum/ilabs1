// ======================================
// FO AI PERSONA (HYBRID: GEMINI + OFFLINE FALLBACK)
// Tries Gemini LLM first for natural responses.
// Falls back to the offline engine if Gemini is
// unavailable, rate-limited, or too slow.
// ======================================

const llmService = require("./llmService");
const offlineResponseEngine = require("./offlineResponseEngine");
const truthEngine = require("./truthEngine");

// ======================================
// GEMINI SYSTEM PROMPT FOR FO
// ======================================
function buildFOSystemPrompt(trade) {
  const issues = offlineResponseEngine.analyzeTradeContext(trade);
  const mismatches = truthEngine.getMismatchFields(trade);

  let context = `You are a Front Office Trading Desk professional replying to the Middle Office.
You are responding about Trade ${trade.tradeRef}.
Counterparty: ${trade.counterparty || "Unknown"}
Currency: ${trade.currency || "USD"}
`;

  if (trade.truths?.mo && trade.booking) {
    context += `\nTrade Truth Data (FO Reference):
- Amount: ${trade.truths.mo.amount}
- Value Date: ${trade.truths.mo.valueDate || "N/A"}
- Currency: ${trade.truths.mo.currency || "N/A"}
- Counterparty: ${trade.truths.mo.counterparty || "N/A"}

Booking Data (MO System):
- Amount: ${trade.booking.amount}
- Value Date: ${trade.booking.valueDate || "N/A"}
- Currency: ${trade.booking.currency || "N/A"}
- Counterparty: ${trade.booking.counterparty || "N/A"}
`;
  }

  if (mismatches.length > 0) {
    context += `\nKNOWN MISMATCHES: ${mismatches.join(", ")}`;
  }

  if (issues.length > 0) {
    context += `\nDETECTED ISSUES:\n${issues.map(i => "• " + i).join("\n")}`;
  } else {
    context += `\nNO ISSUES DETECTED. The trade is clean.`;
  }

  context += `

RULES:
- Reply professionally, like a real FO trader would in an Outlook email.
- If there are mismatches, clearly state them with the correct values and explicitly confirm that the Front Office (you) will amend the trade in the booking system. Do NOT ask the operations analyst to amend it.
- If there are no issues, confirm that the trade is clean.
- If the user's query is vague or just a greeting, ask for clarification.
- Keep responses concise (2-5 sentences).
- Do NOT invent issues that don't exist in the data above.
- Sign off with a realistic name and title.

Respond in this JSON format:
{
  "action": "IMMEDIATE_ANSWER",
  "category": "<GREETING|CLARIFICATION|ERROR_CHECK_WITH_ISSUES|ERROR_CHECK_NO_ISSUES|AMOUNT_MISMATCH|AMOUNT_CORRECT|VALUE_DATE_MISMATCH|VALUE_DATE_CORRECT|CURRENCY_MISMATCH|CURRENCY_CORRECT|COUNTERPARTY_MISMATCH|COUNTERPARTY_CORRECT|CLEAN_TRADE|GENERIC_INVESTIGATION>",
  "subject": "RE: Trade <tradeRef> — FO Response",
  "body": "<your email body>"
}`;

  return context;
}

// ======================================
// MAIN RESPONSE GENERATOR (HYBRID)
// ======================================
async function generateFOResponse(trade, userMessage) {
  if (!trade) return null;

  // ── ATTEMPT 1: Gemini LLM ──
  try {
    const systemPrompt = buildFOSystemPrompt(trade);
    const geminiResult = await llmService.generateResponse(systemPrompt, userMessage);

    if (geminiResult && geminiResult.body) {
      console.log("✅ FO Response: Gemini LLM succeeded for", trade.tradeRef);
      return geminiResult;
    }
  } catch (err) {
    console.warn("⚠️ FO Gemini failed, falling back to offline engine:", err.message);
  }

  // ── ATTEMPT 2: Offline Engine (guaranteed) ──
  console.log("🔄 FO Response: Using offline engine for", trade.tradeRef);
  return offlineResponseEngine.generateFOResponseOffline(trade, userMessage);
}

module.exports = {
  generateFOResponse
};
