// ======================================
// CPTY AI PERSONA (HYBRID: GEMINI + OFFLINE FALLBACK)
// Tries Gemini LLM first for natural responses.
// Falls back to the offline engine if Gemini is
// unavailable, rate-limited, or too slow.
// ======================================

const llmService = require("./llmService");
const ssiRepository = require("./ssiRepository");

async function getSSIRecord(trade) {
  if (!trade || !trade.truths || !trade.truths.settlement || !trade.truths.settlement.ssiRefId) {
    return null;
  }
  
  try {
    return await ssiRepository.findByRefId(trade.truths.settlement.ssiRefId);
  } catch (err) {
    console.error("[CPTY AI] Failed to fetch SSI record:", err.message);
    return null;
  }
}

// ======================================
// GEMINI SYSTEM PROMPT FOR CPTY
// ======================================
function buildCPTYSystemPrompt(trade, parsedIntent, ssiRecord) {
  let context = `You are a Counterparty Operations professional replying to a bank's Settlement desk.
You are responding about Trade ${trade.tradeRef}.

`;

  const hasAlertCodes = ssiRecord && ssiRecord.alertCode && ssiRecord.alertAcronym;

  if (hasAlertCodes) {
    context += `OUR SETTLEMENT REFERENCE CODES:
  - Alert Code: ${ssiRecord.alertCode}
  - Acronym Code: ${ssiRecord.alertAcronym}

(Note: You MUST provide BOTH the Alert Code and Acronym Code. Do NOT list out individual SSI fields like bank name or account number. Do NOT confirm if details match or if there are any breaks. Tell them to use both codes to look up our standard settlement instructions in their SSI Database to verify on their end.)`;
  } else {
    // No alert codes — provide full raw SSI details
    const lines = [];
    if (ssiRecord) {
      if (ssiRecord.currency) lines.push(`Currency: ${ssiRecord.currency}`);
      if (ssiRecord.finalBeneficiary) lines.push(`Beneficiary Name: ${ssiRecord.finalBeneficiary}`);
      if (ssiRecord.accountWithInstitution) lines.push(`Beneficiary Bank: ${ssiRecord.accountWithInstitution}`);
      if (ssiRecord.swiftBicCode) lines.push(`Beneficiary BIC: ${ssiRecord.swiftBicCode}`);
      if (ssiRecord.accountNumber) lines.push(`Account Number: ${ssiRecord.accountNumber}`);
      if (ssiRecord.abaRoutingNumber) lines.push(`ABA Routing Number: ${ssiRecord.abaRoutingNumber}`);
      if (ssiRecord.agentBank) lines.push(`Intermediary Bank: ${ssiRecord.agentBank}`);
      if (ssiRecord.agentSwiftCode) lines.push(`Intermediary BIC: ${ssiRecord.agentSwiftCode}`);
      if (ssiRecord.accountAtAgent) lines.push(`Intermediary Account: ${ssiRecord.accountAtAgent}`);
      if (ssiRecord.field72) lines.push(`Field 72: ${ssiRecord.field72}`);
    } else {
      lines.push("No specific instructions found.");
    }
    
    context += `OUR SETTLEMENT INSTRUCTIONS:\n  - ${lines.join("\n  - ")}

(Note: You MUST provide the raw settlement instructions above exactly as listed. Do NOT mention alert codes or acronym codes as we do not use them for this SSI. Tell them to verify these raw details against their system records.)`;
  }

  if (parsedIntent && parsedIntent.intent) {
    context += `\n\nParsed User Intent: ${parsedIntent.intent}`;
  }

  context += `

RULES:
- Reply professionally, like a real counterparty operations desk would in an Outlook email.
- CRITICAL: Do NOT say whether our records match or if there are breaks. The bank must do the matching themselves.
- ${hasAlertCodes ? "CRITICAL: Only provide the Alert Code and Acronym Code. Never reveal raw SSI field values like Account Number." : "CRITICAL: Provide all of the raw Beneficiary and Intermediary details listed above. Do NOT mention or invent alert codes."}
- Keep responses concise but include all provided data points.
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

  const ssiRecord = await getSSIRecord(trade);
  if (trade && trade.direction === "SELL") {
    // For SELL trades, the counterparty is trying to pay us.
    // If the user is emailing them, it's likely to correct an incorrect SSI.
    // Let's assume any email from the user to the CPTY for a SELL trade on Settlement Desk
    // is providing the correct SSI details.
    if (trade.truths && trade.truths.settlement) {
      trade.truths.settlement.cptyProvidedCorrectSSI = true;
      trade.markModified("truths");
      await trade.save();
    }
    
    return {
      action: "IMMEDIATE_ANSWER",
      subject: "RE: Settlement Details",
      body: `Okay thanks for confirming and we are proceeding with these SSI.\n\nBest regards,\nCounterparty Settlements`
    };
  }

  // ── ATTEMPT 1: Gemini LLM ──
  try {
    const systemPrompt = buildCPTYSystemPrompt(trade, parsedIntent, ssiRecord);
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
  
  const hasAlertCodes = ssiRecord && ssiRecord.alertCode && ssiRecord.alertAcronym;
  let fallbackBody = "";

  if (hasAlertCodes) {
    fallbackBody = `Thank you for reaching out regarding this trade.\n\nPlease use the following reference codes to look up our standard settlement instructions in your SSI Database:\n\n  Alert Code: ${ssiRecord.alertCode}\n  Acronym Code: ${ssiRecord.alertAcronym}\n\nKindly verify the settlement details on your end using both codes.\n\nBest regards,\nOperations Desk`;
  } else {
    const lines = [];
    if (ssiRecord) {
      if (ssiRecord.currency) lines.push(`Currency: ${ssiRecord.currency}`);
      if (ssiRecord.finalBeneficiary) lines.push(`Beneficiary Name: ${ssiRecord.finalBeneficiary}`);
      if (ssiRecord.accountWithInstitution) lines.push(`Beneficiary Bank: ${ssiRecord.accountWithInstitution}`);
      if (ssiRecord.swiftBicCode) lines.push(`Beneficiary BIC: ${ssiRecord.swiftBicCode}`);
      if (ssiRecord.accountNumber) lines.push(`Account Number: ${ssiRecord.accountNumber}`);
      if (ssiRecord.abaRoutingNumber) lines.push(`ABA Routing Number: ${ssiRecord.abaRoutingNumber}`);
      if (ssiRecord.agentBank) lines.push(`Intermediary Bank: ${ssiRecord.agentBank}`);
      if (ssiRecord.agentSwiftCode) lines.push(`Intermediary BIC: ${ssiRecord.agentSwiftCode}`);
      if (ssiRecord.accountAtAgent) lines.push(`Intermediary Account: ${ssiRecord.accountAtAgent}`);
      if (ssiRecord.field72) lines.push(`Field 72: ${ssiRecord.field72}`);
    }
    const details = lines.length > 0 ? "\n" + lines.join("\n") : "No specific instructions found.";
    
    fallbackBody = `Thank you for reaching out regarding this trade.\n\nOur settlement instructions for this transaction are:${details}\n\nPlease verify these raw details against your system records.\n\nBest regards,\nOperations Desk`;
  }

  return {
    action: "IMMEDIATE_ANSWER",
    subject: "RE: Trade Inquiry",
    body: fallbackBody
  };
}

module.exports = {
  generateResponse
};