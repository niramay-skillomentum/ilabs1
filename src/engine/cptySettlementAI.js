// ======================================
// CPTY AI PERSONA (HYBRID: GEMINI + OFFLINE FALLBACK)
// Tries Gemini LLM first for natural responses.
// Falls back to the offline engine if Gemini is
// unavailable, rate-limited, or too slow.
// ======================================

const llmService = require("./llmService");
const offlineResponseEngine = require("./offlineResponseEngine");
const truthEngine = require("./truthEngine");

function getSsiId(trade) {
  if (!trade) return "UNKNOWN-SSI-ID";
  let ssiId = trade.truths?.settlement?.ssiId;
  
  if (!ssiId) {
    const { CPTY_SSIS, ENTITY_SSIS } = require("./tradeGenerator");
    const allDicts = [CPTY_SSIS, ENTITY_SSIS];
    let foundSsi = null;
    for (const dict of allDicts) {
      const ssiList = dict[trade.counterparty] || dict[trade.entity];
      if (ssiList) {
        foundSsi = ssiList.find(s => s.accountNumber === trade.truths?.settlement?.accountNumber);
        if (!foundSsi) foundSsi = ssiList[0];
      }
      if (foundSsi) {
        ssiId = foundSsi.ssiId;
        break;
      }
    }
    if (!ssiId) ssiId = "UNKNOWN-SSI-ID";
  }
  return ssiId;
}

// ======================================
// GEMINI SYSTEM PROMPT FOR CPTY
// ======================================
function buildCPTYSystemPrompt(trade, parsedIntent) {
  const ssiId = getSsiId(trade);

  let context = `You are a Counterparty Operations professional replying to a bank's Settlement desk.
You are responding about Trade ${trade.tradeRef}.

OUR STANDARD SETTLEMENT INSTRUCTION (SSI) ID: ${ssiId}
(Note: You MUST ONLY provide this SSI ID. Do NOT list out the individual fields like bank name or account number. Do NOT confirm if details match or if there are any breaks. Tell them to use our standard SSI ID "${ssiId}" and look it up in their SSI Database to verify on their end.)`;

  if (parsedIntent && parsedIntent.intent) {
    context += `\nParsed User Intent: ${parsedIntent.intent}`;
  }

  context += `

RULES:
- Reply professionally, like a real counterparty operations desk would in an Outlook email.
- CRITICAL: Do NOT say whether our records match or if there are breaks. The bank must do the matching themselves.
- CRITICAL: Only provide the SSI ID.
- Keep responses concise (2-4 sentences).
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
  let trade = null;
  try {
    const Trade = require("../models/Trade");
    trade = await Trade.findOne({ tradeRef });
  } catch (err) {
    console.warn("Failed to fetch trade:", err.message);
  }

  // ── ATTEMPT 1: Gemini LLM ──
  try {
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
  const ssiId = getSsiId(trade);
  return {
    action: "IMMEDIATE_ANSWER",
    subject: "RE: Trade Inquiry",
    body: `Our standard settlement instruction (SSI) ID is ${ssiId}. Please refer to this ID in your SSI Database.`
  };
}

module.exports = {
  generateResponse
};