// ======================================
// CPTY AI PERSONA (HYBRID: GEMINI + OFFLINE FALLBACK)
// Tries Gemini LLM first for natural responses.
// Falls back to the offline engine if Gemini is
// unavailable, rate-limited, or too slow.
// ======================================

const llmService = require("./llmService");
const offlineResponseEngine = require("./offlineResponseEngine");
const truthEngine = require("./truthEngine");

function getSSICodes(trade) {
  if (!trade) return { alertCode: "UNKNWN", acronymCode: "000000" };
  
  const { CPTY_SSIS, ENTITY_SSIS } = require("./tradeGenerator");
  const allDicts = [CPTY_SSIS, ENTITY_SSIS];
  let foundSsi = null;
  
  // First try matching by the truth ssiId
  const truthSsiId = trade.truths?.settlement?.ssiId;
  if (truthSsiId) {
    for (const dict of allDicts) {
      for (const key in dict) {
        const match = dict[key].find(s => s.ssiId === truthSsiId);
        if (match) { foundSsi = match; break; }
      }
      if (foundSsi) break;
    }
  }
  
  // Fallback: match by counterparty/entity + account number
  if (!foundSsi) {
    for (const dict of allDicts) {
      const ssiList = dict[trade.counterparty] || dict[trade.entity];
      if (ssiList) {
        foundSsi = ssiList.find(s => s.accountNumber === trade.truths?.settlement?.accountNumber);
        if (!foundSsi) foundSsi = ssiList[0];
      }
      if (foundSsi) break;
    }
  }
  
  if (!foundSsi) return { alertCode: "UNKNWN", acronymCode: "000000" };
  return { alertCode: foundSsi.alertCode, acronymCode: foundSsi.acronymCode };
}

// ======================================
// GEMINI SYSTEM PROMPT FOR CPTY
// ======================================
function buildCPTYSystemPrompt(trade, parsedIntent) {
  const codes = getSSICodes(trade);

  let context = `You are a Counterparty Operations professional replying to a bank's Settlement desk.
You are responding about Trade ${trade.tradeRef}.

OUR SETTLEMENT REFERENCE CODES:
  - Alert Code: ${codes.alertCode}
  - Acronym Code: ${codes.acronymCode}

(Note: You MUST provide BOTH the Alert Code and Acronym Code. Do NOT list out individual SSI fields like bank name or account number. Do NOT confirm if details match or if there are any breaks. Tell them to use both codes to look up our standard settlement instructions in their SSI Database to verify on their end.)`;

  if (parsedIntent && parsedIntent.intent) {
    context += `\nParsed User Intent: ${parsedIntent.intent}`;
  }

  context += `

RULES:
- Reply professionally, like a real counterparty operations desk would in an Outlook email.
- CRITICAL: Do NOT say whether our records match or if there are breaks. The bank must do the matching themselves.
- CRITICAL: Only provide the Alert Code and Acronym Code. Never reveal SSI field values.
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
  const codes = getSSICodes(trade);
  return {
    action: "IMMEDIATE_ANSWER",
    subject: "RE: Trade Inquiry",
    body: `Thank you for reaching out regarding this trade.\n\nPlease use the following reference codes to look up our standard settlement instructions in your SSI Database:\n\n  Alert Code: ${codes.alertCode}\n  Acronym Code: ${codes.acronymCode}\n\nKindly verify the settlement details on your end using both codes.\n\nBest regards,\nOperations Desk`
  };
}

module.exports = {
  generateResponse
};