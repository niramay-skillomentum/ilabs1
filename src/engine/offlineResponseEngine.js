// ======================================
// OFFLINE RESPONSE ENGINE
// Multi-layer Query Classifier & Template Matcher
// ======================================

const foResponses = require("./foOfflineResponses");
const cptyResponses = require("./cptyOfflineResponses");
const foResponseProfiles = require("./foResponseProfiles");
const truthEngine = require("./truthEngine");

// Keep track of recent responses to avoid repeating the same template
const recentTemplates = new Map();

// ======================================
// LAYER 1: GREETINGS & SMALL TALK
// ======================================
const GREETING_PATTERNS = [
  /^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings)/i
];
const THANKS_PATTERNS = [
  /^(thanks|thank\s*you|thx|cheers|appreciate)/i
];

// ======================================
// LAYER 2: KEYWORD SCORING (INTENTS)
// ======================================
const INTENT_KEYWORDS = {
  AMOUNT_QUERY: {
    keywords: ["amount", "notional", "principal", "figure", "number", "wrong amount"],
    weight: 10
  },
  VALUE_DATE_QUERY: {
    keywords: ["value date", "vd", "settlement date", "maturity", "expiry", "wrong date", "date"],
    weight: 10
  },
  ERROR_CHECK_QUERY: {
    keywords: ["error", "issue", "problem", "wrong", "incorrect", "mistake", "check", "verify", "validate", "review", "look into", "investigate", "any issues", "anything wrong", "find error", "discrepancy", "break", "mismatch", "difference"],
    weight: 8
  },
  PAYMENT_QUERY: {
    keywords: ["payment", "funds", "received", "paid", "transfer", "remittance"],
    weight: 10
  },
  SSI_QUERY: {
    keywords: ["ssi", "settlement instructions", "bank details", "nostro", "correspondent"],
    weight: 10
  },
  CONFIRMATION_QUERY: {
    keywords: ["confirm", "confirmation", "confirmed", "affirm", "match"],
    weight: 8
  },
  REFERENCE_QUERY: {
    keywords: ["reference", "ref"],
    weight: 5
  },
  URGENCY_QUERY: {
    keywords: ["urgent", "asap", "immediately", "priority", "escalate", "eod", "end of day", "deadline"],
    weight: 6
  },
  CURRENCY_QUERY: {
    keywords: ["currency", "ccy", "wrong currency"],
    weight: 10
  },
  COUNTERPARTY_QUERY: {
    keywords: ["counterparty", "cpty", "client", "wrong counterparty"],
    weight: 10
  }
};

// ======================================
// CLASSIFICATION ENGINE
// ======================================
function classifyQuery(text) {
  const lowerText = text.toLowerCase().trim();

  // 1. Check Greetings
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(lowerText) && lowerText.length < 30) {
      return "GREETING";
    }
  }

  // 2. Check Thanks
  for (const pattern of THANKS_PATTERNS) {
    if (pattern.test(lowerText) && lowerText.length < 40) {
      return "THANKS";
    }
  }

  // 3. Keyword Scoring
  let maxScore = 0;
  let bestIntent = "UNKNOWN";

  for (const [intent, data] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const keyword of data.keywords) {
      if (lowerText.includes(keyword)) {
        score += data.weight;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestIntent = intent;
    }
  }

  // Threshold to avoid false positives
  if (maxScore >= 8) {
    return bestIntent;
  }

  return "UNKNOWN";
}

// ======================================
// CONTEXT ANALYSIS (LAYER 3)
// ======================================
function analyzeTradeContext(trade) {
  const issues = [];
  
  const moTruth = trade.truths?.mo;
  if (moTruth && trade.booking) {
    if (moTruth.amount !== trade.booking.amount) {
      const diff = Math.abs(moTruth.amount - trade.booking.amount);
      issues.push(`Amount mismatch (Truth: ${moTruth.amount}, Booking: ${trade.booking.amount}, Diff: ${diff})`);
    }
    if (moTruth.valueDate && trade.booking.valueDate && new Date(moTruth.valueDate).getTime() !== new Date(trade.booking.valueDate).getTime()) {
      issues.push(`Value Date mismatch (Truth: ${formatVD(moTruth.valueDate)}, Booking: ${formatVD(trade.booking.valueDate)})`);
    }
    if (moTruth.currency !== trade.booking.currency) {
      issues.push(`Currency mismatch (Truth: ${moTruth.currency}, Booking: ${trade.booking.currency})`);
    }
    if (moTruth.counterparty !== trade.booking.counterparty) {
      issues.push(`Counterparty mismatch (Truth: ${moTruth.counterparty}, Booking: ${trade.booking.counterparty})`);
    }
  }
  
  if (trade.age > 2) {
    issues.push(`Trade is aged (${trade.age} days old)`);
  }
  
  return issues;
}

function buildIssueList(issues) {
  if (issues.length === 0) return "";
  return issues.map(i => "• " + i).join("\n");
}

function formatVD(d) {
  if (!d) return "";
  const date = new Date(d);
  if (date.toString() === "Invalid Date") return d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ======================================
// TEMPLATE SELECTION & RENDERING
// ======================================
function pickWithVariety(templates, tradeRef) {
  if (!templates || templates.length === 0) return "We are reviewing your query.";
  
  if (!recentTemplates.has(tradeRef)) {
    recentTemplates.set(tradeRef, []);
  }
  
  const history = recentTemplates.get(tradeRef);
  
  // Try to find a template we haven't used recently
  let available = templates.filter(t => !history.includes(t));
  
  if (available.length === 0) {
    // If we've used them all, clear history and pick from all
    available = templates;
    history.length = 0; 
  }
  
  const picked = available[Math.floor(Math.random() * available.length)];
  
  // Update history
  history.push(picked);
  if (history.length > 3) history.shift(); // Keep last 3
  
  return picked;
}

function renderTemplate(template, trade, issues = [], isCpty = false) {
  let result = template;
  
  result = result.replace(/\{\{tradeRef\}\}/g, trade.tradeRef || "UNKNOWN");
  
  const truth = isCpty ? trade.truths?.confirmation : trade.truths?.mo;
  const legacyTruth = trade.truth; // fallback
  
  if (truth) {
    result = result.replace(/\{\{truthAmount\}\}/g, (truth.amount || "N/A").toLocaleString());
    result = result.replace(/\{\{truthVD\}\}/g, formatVD(truth.valueDate));
  } else if (legacyTruth) {
    result = result.replace(/\{\{truthAmount\}\}/g, (legacyTruth.amount || "N/A").toLocaleString());
    result = result.replace(/\{\{truthVD\}\}/g, formatVD(legacyTruth.valueDate));
  }
  
  if (trade.booking) {
    result = result.replace(/\{\{bookingAmount\}\}/g, (trade.booking.amount || "N/A").toLocaleString());
    result = result.replace(/\{\{bookingVD\}\}/g, formatVD(trade.booking.valueDate));
  }

  result = result.replace(/\{\{currency\}\}/g, trade.currency || "");
  result = result.replace(/\{\{counterparty\}\}/g, trade.counterparty || "");
  
  if (issues.length > 0) {
    result = result.replace(/\{\{issueList\}\}/g, buildIssueList(issues));
  }
  
  return result;
}

// ======================================
// MAIN GENERATOR: FO
// ======================================
function generateFOResponseOffline(trade, userMessage, overridePersonality = null) {
  if (!trade) return null;

  const profile = foResponseProfiles.getProfile(trade.counterparty);
  const personality = overridePersonality || profile.personality || "FORMAL";
  const intent = classifyQuery(userMessage);
  
  let categoryStr = "GENERIC_INVESTIGATION";
  const issues = analyzeTradeContext(trade);
  const hasIssues = issues.length > 0;

  if (intent === "GREETING") categoryStr = "GREETING";
  else if (intent === "THANKS") categoryStr = "THANKS";
  else if (intent === "ERROR_CHECK_QUERY") {
    categoryStr = hasIssues ? "ERROR_CHECK_WITH_ISSUES" : "ERROR_CHECK_NO_ISSUES";
  }
  else if (intent === "AMOUNT_QUERY") {
    const mismatches = truthEngine.getMismatchFields(trade);
    categoryStr = mismatches.includes("amount") ? "AMOUNT_MISMATCH" : "AMOUNT_CORRECT";
  }
  else if (intent === "VALUE_DATE_QUERY") {
    const mismatches = truthEngine.getMismatchFields(trade);
    categoryStr = mismatches.includes("valueDate") ? "VALUE_DATE_MISMATCH" : "VALUE_DATE_CORRECT";
  }
  else if (intent === "CURRENCY_QUERY") {
    const mismatches = truthEngine.getMismatchFields(trade);
    categoryStr = mismatches.includes("currency") ? "CURRENCY_MISMATCH" : "CURRENCY_CORRECT";
  }
  else if (intent === "COUNTERPARTY_QUERY") {
    const mismatches = truthEngine.getMismatchFields(trade);
    categoryStr = mismatches.includes("counterparty") ? "COUNTERPARTY_MISMATCH" : "COUNTERPARTY_CORRECT";
  }
  else if (intent === "URGENCY_QUERY") categoryStr = "URGENCY";
  else if (intent === "UNKNOWN") {
    if (userMessage.length < 30) {
      categoryStr = "CLARIFICATION";
    } else {
      categoryStr = "GENERIC_INVESTIGATION";
    }
  } else {
    const mismatches = truthEngine.getMismatchFields(trade);
    if (mismatches.includes("amount")) categoryStr = "AMOUNT_MISMATCH";
    else if (mismatches.includes("valueDate")) categoryStr = "VALUE_DATE_MISMATCH";
    else if (mismatches.includes("currency")) categoryStr = "CURRENCY_MISMATCH";
    else if (mismatches.includes("counterparty")) categoryStr = "COUNTERPARTY_MISMATCH";
    else if (mismatches.length === 0 && !hasIssues) categoryStr = "CLEAN_TRADE";
  }

  const categoryTemplates = foResponses[categoryStr] || foResponses.GENERIC_INVESTIGATION;
  const templates = categoryTemplates[personality] || categoryTemplates.FORMAL;
  
  const rawTemplate = pickWithVariety(templates, trade.tradeRef);
  const renderedBody = renderTemplate(rawTemplate, trade, issues);

  let finalBody = renderedBody;
  if (!overridePersonality) {
    const names = ["Chris Evans", "Sam Patel", "Jordan Lee"];
    const titles = ["Senior Trader", "Desk Head", "Trading Associate"];
    finalBody += `\n\n--\n${names[Math.floor(Math.random() * names.length)]}\n${titles[Math.floor(Math.random() * titles.length)]} | Front Office Trading`;
  }

  return {
    action: "IMMEDIATE_ANSWER",
    category: categoryStr,
    subject: `RE: Trade ${trade.tradeRef} — FO Response`,
    body: finalBody
  };
}

// ======================================
// MAIN GENERATOR: CPTY
// ======================================
async function generateCPTYResponseOffline(parsedIntent, tradeRef, userMessage) {
  const intent = classifyQuery(userMessage || parsedIntent.intent);
  
  // Default to a formal tone (since CPTY doesn't have profiles right now)
  const tone = "FORMAL"; 
  
  let categoryStr = "GENERAL_INQUIRY";
  
  const Trade = require("../models/Trade");
  let trade = await Trade.findOne({ tradeRef }).lean();
  
  if (!trade) {
    const scenario = truthEngine.getScenario(tradeRef) || {};
    trade = { tradeRef, truth: scenario, currency: scenario.currency };
  }

  if (intent === "GREETING") categoryStr = "GREETING";
  else if (intent === "THANKS") categoryStr = "THANKS";
  else if (intent === "ERROR_CHECK_QUERY" || intent === "CONFIRMATION_QUERY" || parsedIntent.intent === "CONFIRMATION_REQUEST") {
    const cptyRound = trade.cptyContactCount || 1;
    const targetDeskTruth = cptyRound > 1 ? "universal" : "confirmation";
    const confirmMismatches = truthEngine.getConfirmationMismatches(trade, targetDeskTruth);
    
    if (confirmMismatches && confirmMismatches.length > 0) {
      if (cptyRound > 1) {
         // CPTY checks Universal Truth and still finds a mismatch. They stay firm.
         categoryStr = "CPTY_STAYS_FIRM";
      } else {
         categoryStr = "ERROR_CHECK_WITH_ISSUES";
      }
    } else {
      if (cptyRound > 1) {
         // CPTY checks Universal Truth and finds NO mismatch. They admit mistake.
         categoryStr = "CPTY_ADMITS_MISTAKE";
      } else {
         categoryStr = "ERROR_CHECK_NO_ISSUES";
      }
    }
  }
  else if (intent === "PAYMENT_QUERY" || parsedIntent.intent === "PAYMENT_STATUS_QUERY") {
    const payment = truthEngine.checkPaymentReceived(tradeRef);
    categoryStr = (payment && payment.paymentReceived) ? "PAYMENT_RECEIVED" : "PAYMENT_NOT_RECEIVED";
  }
  else if (intent === "SSI_QUERY" || parsedIntent.intent === "SSI_QUERY") {
    const ssiCheck = truthEngine.verifySSI(tradeRef);
    categoryStr = (ssiCheck && ssiCheck.correct) ? "SSI_CORRECT" : "SSI_MISMATCH";
  }
  else if (intent === "REFERENCE_QUERY" || parsedIntent.reference) {
    const refCheck = truthEngine.verifyReference(tradeRef, parsedIntent.reference || tradeRef);
    if (!refCheck || !refCheck.correct) categoryStr = "REFERENCE_INCORRECT";
  }
  else if (intent === "UNKNOWN") {
    if (userMessage && userMessage.length < 30) {
      categoryStr = "CLARIFICATION";
    } else {
      categoryStr = "GENERAL_INQUIRY";
    }
  }

  const categoryTemplates = cptyResponses[categoryStr] || cptyResponses.GENERAL_INQUIRY;
  const templates = categoryTemplates[tone] || categoryTemplates.FORMAL;
  
  const rawTemplate = pickWithVariety(templates, tradeRef);
  
  // Mock issues for rendering if needed
  const renderIssues = [];
  if (categoryStr === "SSI_MISMATCH") {
      const ssiCheck = truthEngine.verifySSI(tradeRef);
      // We'll replace {{correctSSI}} manually here
  }
  
  if (categoryStr === "ERROR_CHECK_WITH_ISSUES" || categoryStr === "CPTY_STAYS_FIRM" || categoryStr === "CPTY_ADMITS_MISTAKE") {
      const targetDeskTruth = (trade.cptyContactCount || 1) > 1 ? "universal" : "confirmation";
      const confirmMismatches = truthEngine.getConfirmationMismatches(trade, targetDeskTruth);
      if (confirmMismatches && confirmMismatches.length > 0) {
          confirmMismatches.forEach(m => {
              renderIssues.push(`- ${m.field}: Your system shows ${m.tradeValue}, but we expect ${m.cptyExpected}`);
          });
      } else if (trade.truth && trade.truth.breakType) {
          renderIssues.push(`- Flagged Break Type: ${trade.truth.breakType}`);
      }
  }
  
  let renderedBody = renderTemplate(rawTemplate, trade, renderIssues, true);
  
  if (categoryStr === "SSI_MISMATCH") {
      const ssiCheck = truthEngine.verifySSI(tradeRef);
      renderedBody = renderedBody.replace(/\{\{correctSSI\}\}/g, ssiCheck ? ssiCheck.correctSSI : "CITIUS33XXX");
  }

  const generateSignature = () => {
    const names = ["Alex Smith", "Jamie Doe", "Taylor Jenkins", "Morgan Riley"];
    const titles = ["Operations Specialist", "Settlements Analyst", "Trade Support Manager"];
    return `Best regards,\n\n--\n${names[Math.floor(Math.random() * names.length)]}\n${titles[Math.floor(Math.random() * titles.length)]} | Counterparty Operations`;
  };

  return {
    action: "IMMEDIATE_ANSWER",
    subject: "RE: Trade Inquiry",
    body: `${renderedBody}\n\n${generateSignature()}`
  };
}

module.exports = {
  generateFOResponseOffline,
  generateCPTYResponseOffline,
  classifyQuery,
  analyzeTradeContext
};
