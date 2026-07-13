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
// REFERENCE-DATA CACHE
// ============================
// Reference data (SSI records, securities) is effectively static — it changes
// only via the import script. The trade generator, however, hit the DB ~3x per
// generated trade (60+ round-trips per "Generate Queue"). We load the whole
// active reference set once and serve all hot lookups from memory, refreshing
// on a TTL. Call invalidateRefCache() after an import to force an immediate
// rebuild.
const REF_TTL_MS = parseInt(process.env.SSI_REF_TTL_MS, 10) || 10 * 60_000;

let _cache = null;       // { currencies, secCurrencies, ratio, cptysByCur, ssiByCptyCur, secByCur }
let _cacheAt = 0;
let _cachePromise = null; // de-dupes concurrent rebuilds

function _uc(v) {
  return String(v || "").toUpperCase();
}

async function _buildCache() {
  const [ssis, securities] = await Promise.all([
    SSIReference.find({ active: true }).lean(),
    Security.find({}).lean()
  ]);

  const cptysByCur = new Map();     // CUR -> Set(groupCounterPartyName)
  const ssiByCptyCur = new Map();   // `${cpty}::${CUR}` -> [ssi]
  const currencySet = new Set();
  let correspondent = 0;

  for (const ssi of ssis) {
    const cur = _uc(ssi.currency);
    currencySet.add(cur);

    if (!cptysByCur.has(cur)) cptysByCur.set(cur, new Set());
    if (ssi.groupCounterPartyName) cptysByCur.get(cur).add(ssi.groupCounterPartyName);

    const key = `${ssi.groupCounterPartyName}::${cur}`;
    if (!ssiByCptyCur.has(key)) ssiByCptyCur.set(key, []);
    ssiByCptyCur.get(key).push(ssi);

    if (ssi.agentBank && String(ssi.agentBank).trim().length > 0) correspondent++;
  }

  const secByCur = new Map();
  const secCurrencySet = new Set();
  for (const sec of securities) {
    const cur = _uc(sec.currency);
    secCurrencySet.add(cur);
    if (!secByCur.has(cur)) secByCur.set(cur, []);
    secByCur.get(cur).push(sec);
  }

  const total = ssis.length;
  return {
    currencies: [...currencySet],
    secCurrencies: [...secCurrencySet],
    ratio: total > 0 ? correspondent / total : 0.78,
    cptysByCur,
    ssiByCptyCur,
    secByCur,
    securities
  };
}

async function _getCache() {
  if (!getIsConnected()) return null;
  if (_cache && Date.now() - _cacheAt < REF_TTL_MS) return _cache;
  if (_cachePromise) return _cachePromise; // a rebuild is already in flight
  _cachePromise = _buildCache()
    .then((c) => {
      _cache = c;
      _cacheAt = Date.now();
      return c;
    })
    .catch((err) => {
      console.warn("[SSIRepository] Reference cache build failed:", err.message);
      return _cache; // serve stale on failure rather than throwing
    })
    .finally(() => { _cachePromise = null; });
  return _cachePromise;
}

function invalidateRefCache() {
  _cache = null;
  _cacheAt = 0;
}

function _pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
  const cache = await _getCache();
  if (!cache) return [];
  return cache.ssiByCptyCur.get(`${counterpartyName}::${_uc(currency)}`) || [];
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
  const cache = await _getCache();
  if (!cache) return [];
  const set = cache.cptysByCur.get(_uc(currency));
  return set ? [...set] : [];
}

/**
 * Get all distinct currencies available in the SSI reference data.
 *
 * @returns {Promise<string[]>} Array of unique currency codes
 */
async function getAvailableCurrencies() {
  const cache = await _getCache();
  return cache ? cache.currencies : [];
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

  const truthIndex = Math.floor(Math.random() * candidateSSIs.length);
  truthSSI = candidateSSIs[truthIndex];
  presentedSSI = { ...truthSSI };

  if (hasBreak) {
    breakScenario = "ACCOUNT_NUMBER_MISMATCH";
    
    if (presentedSSI.accountNumber) {
      const acctStr = String(presentedSSI.accountNumber);
      if (acctStr.length > 0) {
        // Tweak the account number by appending 2 to 4 random digits
        const randomNumbers = Math.floor(Math.random() * 9000) + 100; // 3 or 4 random digits
        presentedSSI.accountNumber = acctStr + String(randomNumbers);
      } else {
        presentedSSI.accountNumber = String(Math.floor(Math.random() * 90000000) + 10000000);
      }
    } else {
      presentedSSI.accountNumber = String(Math.floor(Math.random() * 90000000) + 10000000);
    }
    
    console.log(`[SSIRepository] Break created: Tweaked account number for ${counterpartyName}/${currency}. Truth=${truthSSI.accountNumber}, Presented=${presentedSSI.accountNumber}`);
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
  const cache = await _getCache();
  if (!cache) return { correspondent: 0, direct: 0, ratio: 0.78 };
  return { ratio: cache.ratio };
}

// ============================
// SECURITY LOOKUP
// ============================

/**
 * Get a completely random security (across all currencies).
 *
 * @returns {Promise<Object|null>} Security document or null
 */
async function getRandomSecurity() {
  const cache = await _getCache();
  if (!cache || !cache.securities || cache.securities.length === 0) return null;
  return _pickRandom(cache.securities);
}

/**
 * Get a random security for a given currency.
 * Used in the flow: Product → Security → ISIN/Currency.
 *
 * @param {string} currency - 3-letter currency code
 * @returns {Promise<Object|null>} Security document or null
 */
async function getSecurityByCurrency(currency) {
  const cache = await _getCache();
  if (!cache) return null;
  const securities = cache.secByCur.get(_uc(currency));
  if (!securities || securities.length === 0) return null;
  return _pickRandom(securities);
}

/**
 * Get all distinct currencies from the securities collection.
 *
 * @returns {Promise<string[]>} Array of currency codes
 */
async function getSecurityCurrencies() {
  const cache = await _getCache();
  return cache ? cache.secCurrencies : [];
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
  getRandomSecurity,

  // Search
  findByAlertCodes,
  findByRefId,

  // Counterparty
  getAllCounterparties,

  // Cache control (call after a reference-data import)
  invalidateRefCache,

  // Helpers (exposed for testing)
  deriveSettlementType,
  createSnapshot
};
