// ======================================
// FO AI PERSONA (HYBRID: GEMINI + FALLBACK ENGINE)
// Uses 4-layer fallback: LLM → Cache → Template → Generic Safe.
// Entity-aware: enriches prompt with entity persona when provided.
// ======================================

const fallbackEngine = require("./fallbackEngine");
const offlineResponseEngine = require("./offlineResponseEngine");
const truthEngine = require("./truthEngine");
const moFOPersonaProfiles = require("./moFOPersonaProfiles");

// ======================================
// GEMINI SYSTEM PROMPT FOR FO
// ======================================
function buildFOSystemPrompt(trade, entityPersona = null) {
  const issues = offlineResponseEngine.analyzeTradeContext(trade);
  const mismatches = truthEngine.getMismatchFields(trade);

  let context = `You are a Front Office Trading Desk professional replying to the Middle Office.
You are responding about Trade ${trade.tradeRef}.
Counterparty: ${trade.counterparty || "Unknown"}
Currency: ${trade.currency || "USD"}
`;

  // Entity persona enrichment
  if (entityPersona && entityPersona.entityCode !== "SBG_UNKNOWN") {
    const sig = moFOPersonaProfiles.pickSignatory(entityPersona);
    context += `
YOU ARE: ${sig.name}, ${sig.title} at ${entityPersona.entityName}
Department: ${entityPersona.department}
Region: ${entityPersona.region}
Communication Style: ${entityPersona.personality}
Sign all replies EXACTLY as: "${sig.name} | ${sig.title} | ${entityPersona.department} | ${entityPersona.entityName}"
`;
  }

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
- Sign off with your name and title as specified above. Do NOT use placeholders like [Your Name].

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
// MAIN RESPONSE GENERATOR (FALLBACK ENGINE)
// ======================================
// SET THIS TO true TO TEST OFFLINE TEMPLATES (TURNS OFF LLM AI & CACHE)
const FORCE_OFFLINE = true;

async function generateFOResponse(trade, userMessage, entityPersona = null) {
  if (!trade) return null;

  const persona = entityPersona || moFOPersonaProfiles.getEntityPersona(null);
  const mismatches = truthEngine.getMismatchFields(trade);

  const res = await fallbackEngine.generateWithFallback({
    desk: "FO",
    responder: persona.entityCode || "FO",
    trade,
    userMessage,
    intent: mismatches.length > 0 ? "ERROR_CHECK_WITH_ISSUES" : "CLEAN_TRADE",
    hasIssues: mismatches.length > 0,
    personality: persona.personality || "FORMAL",
    buildPrompt: () => buildFOSystemPrompt(trade, entityPersona),
    offlineOnly: FORCE_OFFLINE
  });

  // When forced offline or when using template fallbacks, append the entity sign-off!
  if (res && res.body && entityPersona && entityPersona.entityCode !== "SBG_UNKNOWN") {
    const signOff = moFOPersonaProfiles.generateSignOff(entityPersona);
    if (!res.body.includes(entityPersona.entityName)) {
      res.body = res.body.trim() + signOff;
    }
  }

  return res;
}

module.exports = {
  generateFOResponse,
  FORCE_OFFLINE
};
