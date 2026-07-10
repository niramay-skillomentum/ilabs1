// ======================================
// SSI REPOSITORY (DATA ACCESS LAYER)
// Clean repository pattern for SSI reference data lookups.
//
// This module is the ONLY place that queries the SSIReference
// collection. All other modules access SSI data through this
// repository, preserving separation of concerns.
//
// IMPORTANT: This module NEVER modifies SSI reference data.
// ======================================

const SSIReference = require("../models/SSIReference");
const Security = require("../models/Security");
const Counterparty = require("../models/Counterparty");
const { getIsConnected } = require("../db");

// ============================
// SSI LOOKUP
// ============================

/**
 * Find all active SSI records for a counterparty + currency.
 * Returns immutable reference data — NEVER modify the result.
 *
 * @param {string} counterpartyName - Group Counter Party Name (exact match)
 * @param {string} currency - 3-letter currency code
 * @returns {Promise<Object[]>} Array of matching SSI documents (lean)
 */
async function findMatchingSSIs(counterpartyName, currency) {
  if (!getIsConnected()) return [];

  const results = await SSIReference.find({
    groupCounterPartyName: counterpartyName,
    currency: currency.toUpperCase(),
    active: true
  }).lean();

  return results;
}

/**
 * Find all active SSI records for a given currency (across all counterparties).
 * Used when we need to select a counterparty that has SSI data for a given currency.
 *
 * @param {string} currency - 3-letter currency code
 * @returns {Promise<Object[]>} Array of matching SSI documents (lean)
 */
async function findSSIsByCurrency(currency) {
  if (!getIsConnected()) return [];

  return SSIReference.find({
    currency: currency.toUpperCase(),
    active: true
  }).lean();
}

/**
 * Get all distinct counterparty names that have SSI data for a given currency.
 *
 * @param {string} currency - 3-letter currency code
 * @returns {Promise<string[]>} Array of unique counterparty names
 */
async function getCounterpartiesForCurrency(currency) {
  if (!getIsConnected()) return [];

  return SSIReference.distinct("groupCounterPartyName", {
    currency: currency.toUpperCase(),
    active: true
  });
}

/**
 * Get all distinct currencies available in the SSI reference data.
 *
 * @returns {Promise<string[]>} Array of unique currency codes
 */
async function getAvailableCurrencies() {
  if (!getIsConnected()) return [];

  return SSIReference.distinct("currency", { active: true });
}

// ============================
// SSI PAIR SELECTION (for Trade Generator)
// ============================

/**
 * Select Truth SSI and Presented SSI for a trade.
 *
 * - Clean trade: truthSSI === presentedSSI (same record)
 * - Break trade: truthSSI !== presentedSSI (two different valid records)
 *
 * IMPORTANT: Neither SSI is ever modified. Both are valid reference data.
 * Settlement breaks come from the DIFFERENCE between two valid records,
 * exactly like the simulator's MO and Confirmation truth comparisons.
 *
 * @param {string} counterpartyName - Group Counter Party Name
 * @param {string} currency - 3-letter currency code
 * @param {boolean} hasBreak - Whether to create a settlement break
 * @returns {Promise<Object|null>} { truthSSI, presentedSSI, truthSSIRefId, presentedSSIRefId, settlementType, breakScenario }
 */
async function selectSSIPair(counterpartyName, currency, hasBreak = false, preferredSettlementType = null) {
  const matchingSSIs = await findMatchingSSIs(counterpartyName, currency);

  if (matchingSSIs.length === 0) {
    return null;
  }

  // Filter by preferred settlement type if specified
  let candidateSSIs = matchingSSIs;
  if (preferredSettlementType) {
    const filtered = matchingSSIs.filter(ssi => {
      const type = deriveSettlementType(ssi);
      return type === preferredSettlementType;
    });
    // Use filtered set if we have matches, otherwise fall back to all
    if (filtered.length > 0) candidateSSIs = filtered;
  }

  let truthSSI;
  let presentedSSI;
  let breakScenario = null;

  if (hasBreak) {
    // Group candidates by cptyId AND Beneficiary Bank
    const groupedByIdAndBank = {};
    for (const ssi of candidateSSIs) {
      if (!ssi.cptyId) continue;
      const bank = ssi.accountWithInstitution || ssi.finalBeneficiary || "UNKNOWN";
      const key = `${ssi.cptyId}::${bank}`;
      if (!groupedByIdAndBank[key]) groupedByIdAndBank[key] = [];
      groupedByIdAndBank[key].push(ssi);
    }

    // Find groups that have more than 1 SSI record
    const validGroups = Object.values(groupedByIdAndBank).filter(group => group.length > 1);

    if (validGroups.length > 0) {
      // Pick a random group
      const selectedGroup = validGroups[Math.floor(Math.random() * validGroups.length)];
      // Pick two distinct SSIs from this group
      const truthIndex = Math.floor(Math.random() * selectedGroup.length);
      truthSSI = selectedGroup[truthIndex];
      
      const alternatives = selectedGroup.filter((_, idx) => idx !== truthIndex);
      presentedSSI = alternatives[Math.floor(Math.random() * alternatives.length)];
      breakScenario = "SSI_MISMATCH";

      console.log(`[SSIRepository] Break created: Truth=${truthSSI._id} vs Presented=${presentedSSI._id} for ${counterpartyName}/${currency} (ID: ${truthSSI.cptyId}, Bank matched)`);
    } else {
      // Fallback: If we can't find a same-bank match, just try same-ID
      const groupedById = {};
      for (const ssi of candidateSSIs) {
        if (!ssi.cptyId) continue;
        if (!groupedById[ssi.cptyId]) groupedById[ssi.cptyId] = [];
        groupedById[ssi.cptyId].push(ssi);
      }
      const validIdGroups = Object.values(groupedById).filter(group => group.length > 1);

      if (validIdGroups.length > 0) {
        const selectedGroup = validIdGroups[Math.floor(Math.random() * validIdGroups.length)];
        const truthIndex = Math.floor(Math.random() * selectedGroup.length);
        truthSSI = selectedGroup[truthIndex];
        const alternatives = selectedGroup.filter((_, idx) => idx !== truthIndex);
        presentedSSI = alternatives[Math.floor(Math.random() * alternatives.length)];
        breakScenario = "SSI_MISMATCH";
        console.log(`[SSIRepository] Break fallback (ID only) created: Truth=${truthSSI._id} vs Presented=${presentedSSI._id} for ${counterpartyName}/${currency} (ID: ${truthSSI.cptyId})`);
      } else if (candidateSSIs.length > 1) {
        // Fallback 2: just pick any two different records
        const truthIndex = Math.floor(Math.random() * candidateSSIs.length);
        truthSSI = candidateSSIs[truthIndex];
        const alternatives = candidateSSIs.filter((_, idx) => idx !== truthIndex);
        presentedSSI = alternatives[Math.floor(Math.random() * alternatives.length)];
        breakScenario = "SSI_MISMATCH";
        console.log(`[SSIRepository] Break fallback (Any) created: Truth=${truthSSI._id} vs Presented=${presentedSSI._id} for ${counterpartyName}/${currency}`);
      } else {
        // Cannot create a break (only 1 SSI available overall)
        truthSSI = candidateSSIs[0];
        presentedSSI = truthSSI;
        console.log(`[SSIRepository] Only 1 SSI found for ${counterpartyName}/${currency}. No SSI-level break possible.`);
      }
    }
  } else {
    // Clean trade: select a random SSI and use it for both
    const truthIndex = Math.floor(Math.random() * candidateSSIs.length);
    truthSSI = candidateSSIs[truthIndex];
    presentedSSI = truthSSI;
  }

  return {
    truthSSI: createSnapshot(truthSSI),
    presentedSSI: createSnapshot(presentedSSI),
    truthSSIRefId: String(truthSSI._id),
    presentedSSIRefId: String(presentedSSI._id),
    settlementType: deriveSettlementType(truthSSI),
    breakScenario
  };
}

/**
 * Get the ratio of CORRESPONDENT to DIRECT SSI records in the database.
 * Used by the trade generator to maintain realistic settlement type distribution.
 *
 * @returns {Promise<{correspondent: number, direct: number, ratio: number}>}
 */
async function getSettlementTypeRatio() {
  if (!getIsConnected()) return { correspondent: 0, direct: 0, ratio: 0.78 };

  try {
    const pipeline = [
      { $match: { active: true } },
      { $group: {
        _id: { $cond: [{ $and: [{ $ne: ["$agentBank", null] }, { $ne: ["$agentBank", ""] }] }, "CORRESPONDENT", "DIRECT"] },
        count: { $sum: 1 }
      }}
    ];
    const results = await SSIReference.aggregate(pipeline);
    
    let correspondent = 0, direct = 0;
    results.forEach(r => {
      if (r._id === "CORRESPONDENT") correspondent = r.count;
      else direct = r.count;
    });
    
    const total = correspondent + direct;
    return {
      correspondent,
      direct,
      ratio: total > 0 ? correspondent / total : 0.78 // fallback ~78%
    };
  } catch (err) {
    return { correspondent: 0, direct: 0, ratio: 0.78 };
  }
}

// ============================
// SECURITY LOOKUP
// ============================

/**
 * Get a random security for a given currency.
 * Used in the flow: Product → Security → ISIN/Currency.
 *
 * @param {string} currency - 3-letter currency code
 * @returns {Promise<Object|null>} Security document or null
 */
async function getSecurityByCurrency(currency) {
  if (!getIsConnected()) return null;

  const securities = await Security.find({
    currency: currency.toUpperCase()
  }).lean();

  if (securities.length === 0) return null;
  return securities[Math.floor(Math.random() * securities.length)];
}

/**
 * Get all distinct currencies from the securities collection.
 *
 * @returns {Promise<string[]>} Array of currency codes
 */
async function getSecurityCurrencies() {
  if (!getIsConnected()) return [];
  return Security.distinct("currency");
}

// ============================
// ALERT/ACRONYM CODE SEARCH (for SSI Database page)
// ============================

/**
 * Search for an SSI by alert code and acronym code.
 * Used by the SSI Database page for dual-code search.
 *
 * @param {string} alertCode
 * @param {string} acronymCode (alertAcronym in our model)
 * @returns {Promise<Object|null>} SSI document or null
 */
async function findByAlertCodes(alertCode, acronymCode) {
  if (!getIsConnected()) return null;

  return SSIReference.findOne({
    alertCode: alertCode.trim(),
    alertAcronym: acronymCode.trim(),
    active: true
  }).lean();
}

/**
 * Search for an SSI by its MongoDB _id.
 * Used for traceability lookups.
 *
 * @param {string} refId - MongoDB _id
 * @returns {Promise<Object|null>}
 */
async function findByRefId(refId) {
  if (!getIsConnected()) return null;

  return SSIReference.findById(refId).lean();
}

// ============================
// HELPERS
// ============================

/**
 * Determine settlement type from an SSI record.
 * CORRESPONDENT if agentBank exists, otherwise DIRECT.
 */
function deriveSettlementType(ssi) {
  if (ssi.agentBank && String(ssi.agentBank).trim().length > 0) {
    return "CORRESPONDENT";
  }
  return "DIRECT";
}

/**
 * Create a snapshot of an SSI record for embedding in a trade.
 * This is the frozen-in-time copy stored on the trade document.
 * The snapshot ensures historical trades remain unchanged even if
 * the reference data is updated in the future.
 *
 * Maps from the MongoDB SSIReference schema to the trade's
 * settlement fields (truths.settlement / settlementDetails).
 */
function createSnapshot(ssi) {
  return {
    ssiRefId: String(ssi._id),
    sourceId: ssi.sourceId,
    counterpartyName: ssi.groupCounterPartyName,
    currency: ssi.currency,
    settlementType: deriveSettlementType(ssi),

    // Beneficiary details
    beneficiaryName: ssi.finalBeneficiary || ssi.counterPartyName,
    beneficiaryBank: ssi.accountWithInstitution || "",
    beneficiaryBIC: ssi.swiftBicCode || "",
    accountNumber: ssi.accountNumber ? String(ssi.accountNumber) : "",
    accountType: ssi.typeCode || "Nostro",

    // Settlement method
    settlementMethod: ssi.defaultSwift || "SWIFT",

    // Correspondent/Agent bank details
    correspondentBank: ssi.agentBank || ssi.accountWithInstitution || "",
    intermediaryBank: ssi.agentBank || null,
    intermediaryBIC: ssi.agentSwiftCode || null,
    intermediaryAccount: ssi.accountAtAgent ? String(ssi.accountAtAgent) : null,

    // Reference
    abaRoutingNumber: ssi.abaRoutingNumber || null,
    field72: ssi.field72 || null,

    // Alert codes (for SSI Database page lookups)
    alertCode: ssi.alertCode || null,
    alertAcronym: ssi.alertAcronym || null,

    // Country
    country: ssi.country || ssi.registeredCountry || null
  };
}

/**
 * Check if SSI reference data is available in MongoDB.
 * Used by the trade generator to decide between reference data
 * and in-memory fallback.
 */
async function isReferenceDataAvailable() {
  if (!getIsConnected()) return false;

  try {
    const count = await SSIReference.countDocuments({ active: true });
    return count > 0;
  } catch (err) {
    console.warn("[SSIRepository] Error checking reference data:", err.message);
    return false;
  }
}

// ============================
// COUNTERPARTY LOOKUP
// ============================

/**
 * Get all counterparties.
 *
 * @returns {Promise<Object[]>}
 */
async function getAllCounterparties() {
  if (!getIsConnected()) return [];
  return Counterparty.find({}).lean();
}

module.exports = {
  // SSI lookups
  findMatchingSSIs,
  findSSIsByCurrency,
  getCounterpartiesForCurrency,
  getAvailableCurrencies,

  // Trade generation
  selectSSIPair,
  isReferenceDataAvailable,
  getSettlementTypeRatio,

  // Security
  getSecurityByCurrency,
  getSecurityCurrencies,

  // Search
  findByAlertCodes,
  findByRefId,

  // Counterparty
  getAllCounterparties,

  // Helpers (exposed for testing)
  deriveSettlementType,
  createSnapshot
};
