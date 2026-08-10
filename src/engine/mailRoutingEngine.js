// ======================================
// MAIL ROUTING ENGINE & VALIDATION SERVICE
// Maintains master mappings for Counterparty Operations and FO Regional mailboxes.
// Enforces strict email routing rules with zero-override high-severity warnings.
// ======================================

const Trade = require("../models/Trade");

// ── MASTER COUNTERPARTY MAPPING TABLE ──
const CPTY_DOMAIN_MAP = {
  "JPM": "jpmorgan",
  "JP MORGAN": "jpmorgan",
  "JPMORGAN": "jpmorgan",
  "J.P. MORGAN": "jpmorgan",
  "J.P. MORGAN SECURITIES LLC": "jpmorgan",
  "HSBC": "hsbc",
  "HSBC BANK PLC": "hsbc",
  "CITI": "citi",
  "CITIGROUP": "citi",
  "CITIBANK N.A.": "citi",
  "DB": "db",
  "DEUTSCHE BANK": "db",
  "DEUTSCHE BANK AG": "db",
  "BNP": "bnpparibas",
  "BNP PARIBAS": "bnpparibas",
  "BARC": "barclays",
  "BARCLAYS": "barclays",
  "BARCLAYS CAPITAL": "barclays",
  "MS": "morganstanley",
  "MORGAN STANLEY": "morganstanley",
  "MORGAN STANLEY & CO": "morganstanley",
  "UBS": "ubs",
  "UBS AG": "ubs"
};

// ── MASTER REGIONAL MAPPING TABLE ──
const REGION_MAP = {
  "AMER": "americas",
  "AMERICAS": "americas",
  "US": "americas",
  "USA": "americas",
  "NEW YORK": "americas",
  "EMEA": "emea",
  "EUROPE": "emea",
  "LONDON": "emea",
  "UK": "emea",
  "FRANKFURT": "emea",
  "APAC": "apac",
  "ASIA": "apac",
  "TOKYO": "apac",
  "SINGAPORE": "apac",
  "HONG KONG": "apac"
};

// ── HIGH-SEVERITY WARNING STRINGS (Specification) ──
const WARNING_STRINGS = {
  CPTY: {
    title: "Email Redirection Warning",
    message: "Recipient email validation failed.\n\nThe selected recipient does not match the registered Operations mailbox for the selected Counterparty. Sending emails to an incorrect destination may result in operational failures, settlement delays, confirmation mismatches, data leakage, or other severe business consequences. Please verify the Counterparty and recipient email before proceeding."
  },
  MO: {
    title: "Email Redirection Warning",
    message: "Recipient email validation failed.\n\nThe selected recipient does not correspond to the Front Office mailbox for the selected workstation region. Sending the email to an incorrect mailbox may lead to processing delays, operational issues, miscommunication, or confidential information being delivered to the wrong recipients. Please verify the workstation and recipient email before sending."
  }
};

/**
 * Normalizes counterparty name to configured operations domain
 */
function getCptyOperationsEmail(counterpartyName) {
  if (!counterpartyName) return "operations@unknown-counterparty.com";
  const upper = String(counterpartyName).toUpperCase().trim();
  const mapped = CPTY_DOMAIN_MAP[upper];
  if (mapped) {
    return `operations@${mapped}.com`;
  }
  // Clean string fallback if not in explicit map
  const clean = String(counterpartyName).toLowerCase().replace(/[^a-z0-9]/g, "");
  return `operations@${clean || "unknown"}.com`;
}

/**
 * Normalizes workstation or trade region to FO regional mailbox
 */
function getFoRegionalEmail(region) {
  if (!region) return "fo-operations-americas@skillomentum.com";
  const upper = String(region).toUpperCase().trim();
  const mapped = REGION_MAP[upper] || "americas";
  return `fo-operations-${mapped}@skillomentum.com`;
}

/**
 * Retrieves all available mailboxes from the DB (all counterparties + FO regional boxes)
 */
async function getAllAvailableRecipients(expectedEmail, expectedName, isMo) {
  const optionsMap = new Map();

  // 1. Add Front Office regional mailboxes
  const foRegions = [
    { code: "americas", label: "Americas" },
    { code: "emea", label: "EMEA" },
    { code: "apac", label: "APAC" }
  ];
  foRegions.forEach(r => {
    const email = `fo-operations-${r.code}@skillomentum.com`;
    optionsMap.set(email.toLowerCase(), {
      label: `Front Office Operations (${r.label}) <${email}>`,
      value: email,
      type: "FO"
    });
  });

  // 2. Fetch all unique counterparties from Trade DB & Counterparty DB
  const cptyNames = new Set([
    "JP Morgan", "HSBC", "Citi", "Deutsche Bank", "Barclays",
    "BNP Paribas", "Morgan Stanley", "UBS", "Goldman Sachs"
  ]);

  try {
    const distinctTrades = await Trade.distinct("counterparty");
    if (Array.isArray(distinctTrades)) {
      distinctTrades.forEach(c => {
        if (c && typeof c === "string" && c.trim()) cptyNames.add(c.trim());
      });
    }
  } catch (err) {
    console.error("[MailRoutingEngine] Error loading distinct trade counterparties:", err.message);
  }

  try {
    const Counterparty = require("../models/Counterparty");
    const dbCptys = await Counterparty.find({}, "name").lean();
    if (Array.isArray(dbCptys)) {
      dbCptys.forEach(c => {
        if (c?.name && typeof c.name === "string" && c.name.trim()) cptyNames.add(c.name.trim());
      });
    }
  } catch (err) {
    console.error("[MailRoutingEngine] Error loading counterparty collection:", err.message);
  }

  // 3. Generate operations email for each counterparty and sort alphabetically
  const sortedCptys = Array.from(cptyNames).sort((a, b) => a.localeCompare(b));
  sortedCptys.forEach(name => {
    const email = getCptyOperationsEmail(name);
    if (!optionsMap.has(email.toLowerCase())) {
      optionsMap.set(email.toLowerCase(), {
        label: `${name} Operations <${email}>`,
        value: email,
        type: "COUNTERPARTY"
      });
    }
  });

  // 4. Ensure expected email is present in the options list if not already
  if (expectedEmail && !optionsMap.has(expectedEmail.toLowerCase())) {
    const labelName = expectedName ? `${expectedName} Operations` : "Operations Desk";
    optionsMap.set(expectedEmail.toLowerCase(), {
      label: `${labelName} <${expectedEmail}>`,
      value: expectedEmail,
      type: isMo ? "FO" : "COUNTERPARTY"
    });
  }

  return Array.from(optionsMap.values());
}

/**
 * Retrieves expected recipient based on desk, trade reference, counterparty, and workstation region
 */
async function getExpectedRecipient({ desk, tradeRef, counterparty, workstationRegion, channel }) {
  let cptyName = counterparty;
  let reg = workstationRegion;

  if (tradeRef) {
    try {
      const Trade = require("../models/Trade");
      const trade = await Trade.findOne({ tradeRef }).lean();
      if (trade) {
        if (!cptyName) cptyName = trade.counterparty || trade.booking?.counterparty || "CITI";
        if (!reg) reg = trade.foRegion || trade.region || "AMER";
      }
    } catch (err) {
      console.error("[MailRoutingEngine] Error loading trade for recipient mapping:", err.message);
    }
  }

  // Fallback defaults if DB lookups yielded empty
  if (!cptyName) cptyName = "CITI";
  if (!reg) reg = "AMER";

  const isMo = desk === "MO" || channel === "FO";
  const expectedEmail = isMo ? getFoRegionalEmail(reg) : getCptyOperationsEmail(cptyName);
  const warning = isMo ? WARNING_STRINGS.MO : WARNING_STRINGS.CPTY;
  const allRecipients = await getAllAvailableRecipients(expectedEmail, cptyName, isMo);

  return {
    success: true,
    desk,
    expectedEmail,
    recipientType: isMo ? "FO" : "COUNTERPARTY",
    counterparty: cptyName,
    region: reg,
    allRecipients,
    warningTitle: warning.title,
    warningMessage: warning.message
  };
}

/**
 * Performs strict server-side validation between submitted To email and expected email
 */
async function validateRecipient({ desk, tradeRef, recipientEmail, counterparty, workstationRegion, channel }) {
  const expectedData = await getExpectedRecipient({ desk, tradeRef, counterparty, workstationRegion, channel });
  
  const submitted = String(recipientEmail || "").trim().toLowerCase();
  const expected = String(expectedData.expectedEmail || "").trim().toLowerCase();

  // Allow short codes if legacy call without email (like "FO" or "COUNTERPARTY") only if explicitly bypassed,
  // BUT specification states: "Never rely solely on frontend validation. Reject invalid recipient emails with an appropriate error response."
  // So we match exact email or if submitted equals expected.
  const isValid = submitted === expected;

  if (!isValid) {
    return {
      valid: false,
      errorType: "EMAIL_REDIRECTION_WARNING",
      title: expectedData.warningTitle,
      message: expectedData.warningMessage,
      expectedEmail: expectedData.expectedEmail,
      submittedEmail: submitted
    };
  }

  return {
    valid: true,
    expectedEmail: expectedData.expectedEmail
  };
}

module.exports = {
  CPTY_DOMAIN_MAP,
  REGION_MAP,
  WARNING_STRINGS,
  getCptyOperationsEmail,
  getFoRegionalEmail,
  getExpectedRecipient,
  validateRecipient
};
