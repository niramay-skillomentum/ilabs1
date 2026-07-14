// ======================================
// SSI REPOSITORY (DATA ACCESS LAYER)
// Clean repository pattern for SSI reference data lookups.
//
// This module is the ONLY place that queries the SSIReference,
// Security, Counterparty, and Entity collections. All other modules
// access reference data through this repository.
//
// IMPORTANT: This module NEVER modifies SSI reference data.
// ======================================

const SSIReference = require("../models/SSIReference");
const Security = require("../models/Security");
const Counterparty = require("../models/Counterparty");
const Entity = require("../models/Entity");
const { getIsConnected } = require("../db");

// ============================
// REFERENCE-DATA CACHE
// ============================
const REF_TTL_MS = parseInt(process.env.SSI_REF_TTL_MS, 10) || 10 * 60_000;

let _cache = null;
let _cacheAt = 0;
let _cachePromise = null;

function _uc(v) {
  return String(v || "").toUpperCase();
}

async function _buildCache() {
  const [ssis, securities, entities] = await Promise.all([
    SSIReference.find({ active: true }).lean(),
    Security.find({}).lean(),
    Entity.find({}).lean()
  ]);

  const cptysByCur = new Map();     // CUR -> Set(groupCounterPartyName)
  const ssiByCptyCur = new Map();   // `${cpty}::${CUR}` -> [ssi]
  const ssiByGroup = new Map();     // groupCounterPartyName -> [ssi] (all currencies)
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

    // Index by group (for SSI ID dropdown in settlement break)
    if (ssi.groupCounterPartyName) {
      if (!ssiByGroup.has(ssi.groupCounterPartyName)) ssiByGroup.set(ssi.groupCounterPartyName, []);
      ssiByGroup.get(ssi.groupCounterPartyName).push(ssi);
    }

    if (ssi.agentBank && String(ssi.agentBank).trim().length > 0) correspondent++;
  }

  // Securities indexed by product and by currency
  const secByCur = new Map();
  const secByProduct = new Map();   // product -> [securities]
  const secByProductType = new Map(); // productType -> [securities]
  const secCurrencySet = new Set();

  for (const sec of securities) {
    const cur = _uc(sec.currency);
    secCurrencySet.add(cur);

    if (!secByCur.has(cur)) secByCur.set(cur, []);
    secByCur.get(cur).push(sec);

    // Index by product (Derivative, FX, Equity, Fixed Income)
    const prod = sec.product;
    if (prod) {
      if (!secByProduct.has(prod)) secByProduct.set(prod, []);
      secByProduct.get(prod).push(sec);
    }

    // Index by productType (Forward, FX Spot, Equity, Corporate Bond, etc.)
    const pt = sec.productType;
    if (pt) {
      if (!secByProductType.has(pt)) secByProductType.set(pt, []);
      secByProductType.get(pt).push(sec);
    }
  }

  const total = ssis.length;
  return {
    currencies: [...currencySet],
    secCurrencies: [...secCurrencySet],
    ratio: total > 0 ? correspondent / total : 0.78,
    cptysByCur,
    ssiByCptyCur,
    ssiByGroup,
    secByCur,
    secByProduct,
    secByProductType,
    securities,
    entities
  };
}

async function _getCache() {
  if (!getIsConnected()) return null;
  if (_cache && Date.now() - _cacheAt < REF_TTL_MS) return _cache;
  if (_cachePromise) return _cachePromise;
  _cachePromise = _buildCache()
    .then((c) => {
      _cache = c;
      _cacheAt = Date.now();
      return c;
    })
    .catch((err) => {
      console.warn("[SSIRepository] Reference cache build failed:", err.message);
      return _cache;
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
 */
async function findMatchingSSIs(counterpartyName, currency) {
  const cache = await _getCache();
  if (!cache) return [];
  return cache.ssiByCptyCur.get(`${counterpartyName}::${_uc(currency)}`) || [];
}

/**
 * Find all active SSI records for a given currency (across all counterparties).
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
 */
async function getCounterpartiesForCurrency(currency) {
  const cache = await _getCache();
  if (!cache) return [];
  const set = cache.cptysByCur.get(_uc(currency));
  return set ? [...set] : [];
}

/**
 * Get all distinct currencies available in the SSI reference data.
 */
async function getAvailableCurrencies() {
  const cache = await _getCache();
  return cache ? cache.currencies : [];
}

/**
 * Get all SSI records for a counterparty group (all currencies).
 * Used for the SSI ID dropdown in settlement break flow.
 *
 * @param {string} groupName - Group Counter Party Name
 * @param {string|null} currency - Optional currency filter
 * @returns {Promise<Object[]>} Array of { ssiId, currency, accountWithInstitution, ... }
 */
async function getSSIsByCounterpartyGroup(groupName, currency = null) {
  const cache = await _getCache();
  if (!cache) return [];

  let ssis;
  if (currency) {
    ssis = cache.ssiByCptyCur.get(`${groupName}::${_uc(currency)}`) || [];
  } else {
    ssis = cache.ssiByGroup.get(groupName) || [];
  }

  return ssis.map(ssi => ({
    ssiId: ssi.ssiId || ssi.sourceId,
    refId: String(ssi._id),
    currency: ssi.currency,
    groupCounterPartyName: ssi.groupCounterPartyName,
    counterPartyName: ssi.counterPartyName,
    accountWithInstitution: ssi.accountWithInstitution,
    swiftBicCode: ssi.swiftBicCode,
    accountNumber: ssi.accountNumber ? String(ssi.accountNumber) : "",
    settlementType: deriveSettlementType(ssi),
    agentBank: ssi.agentBank,
    agentSwiftCode: ssi.agentSwiftCode
  }));
}

/**
 * Find an SSI record by its ssiId (generated display ID).
 */
async function findBySsiId(ssiId) {
  if (!getIsConnected()) return null;
  return SSIReference.findOne({ ssiId, active: true }).lean();
}

// ============================
// SSI PAIR SELECTION (for Trade Generator)
// ============================

/**
 * Select Truth SSI and Presented SSI for a trade.
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
        const randomNumbers = Math.floor(Math.random() * 9000) + 100;
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
    truthSsiId: truthSSI.ssiId || truthSSI.sourceId,
    presentedSsiId: presentedSSI.ssiId || presentedSSI.sourceId,
    settlementType: deriveSettlementType(truthSSI),
    breakScenario
  };
}

/**
 * Get the ratio of CORRESPONDENT to DIRECT SSI records.
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
 * Get a completely random security (across all categories).
 */
async function getRandomSecurity() {
  const cache = await _getCache();
  if (!cache || !cache.securities || cache.securities.length === 0) return null;
  return _pickRandom(cache.securities);
}

/**
 * Get a random security for a given product (Derivative, FX, Equity, Fixed Income).
 * Used in the new flow: Product → Product Type → Security → Underlyer/Currency.
 *
 * @param {string} product - Product name (e.g., "FX", "Equity", "Derivative", "Fixed Income")
 * @returns {Promise<Object|null>} Security document or null
 */
async function getSecurityByProduct(product) {
  const cache = await _getCache();
  if (!cache) return null;
  const securities = cache.secByProduct.get(product);
  if (!securities || securities.length === 0) return null;
  return _pickRandom(securities);
}

/**
 * Get a random security for a given product type (Forward, FX Spot, Equity, etc.).
 *
 * @param {string} productType - Product type name
 * @returns {Promise<Object|null>} Security document or null
 */
async function getSecurityByProductType(productType) {
  const cache = await _getCache();
  if (!cache) return null;
  const securities = cache.secByProductType.get(productType);
  if (!securities || securities.length === 0) return null;
  return _pickRandom(securities);
}

/**
 * Get a random security for a given currency.
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
 */
async function getSecurityCurrencies() {
  const cache = await _getCache();
  return cache ? cache.secCurrencies : [];
}

// ============================
// ENTITY LOOKUP
// ============================

/**
 * Get a random entity from the Entity collection.
 * Returns entity with name, code, currency, region.
 *
 * @returns {Promise<Object|null>} Entity document or null
 */
async function getRandomEntity() {
  const cache = await _getCache();
  if (!cache || !cache.entities || cache.entities.length === 0) return null;
  return _pickRandom(cache.entities);
}

/**
 * Get all unique entity names.
 *
 * @returns {Promise<string[]>} Array of entity names
 */
async function getUniqueEntityNames() {
  const cache = await _getCache();
  if (!cache || !cache.entities) return [];
  return [...new Set(cache.entities.map(e => e.entityName))];
}

/**
 * Get all entities.
 *
 * @returns {Promise<Object[]>}
 */
async function getAllEntities() {
  const cache = await _getCache();
  return cache ? cache.entities : [];
}

// ============================
// ALERT/ACRONYM CODE SEARCH
// ============================

/**
 * Search for an SSI by alert code and acronym code.
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
 */
function deriveSettlementType(ssi) {
  if (ssi.agentBank && String(ssi.agentBank).trim().length > 0) {
    return "CORRESPONDENT";
  }
  return "DIRECT";
}

/**
 * Create a snapshot of an SSI record for embedding in a trade.
 */
function createSnapshot(ssi) {
  return {
    ssiRefId: String(ssi._id),
    ssiId: ssi.ssiId || ssi.sourceId,
    sourceId: ssi.sourceId,
    counterpartyGroup: ssi.groupCounterPartyName,
    counterpartyName: ssi.counterPartyName,
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

    // Alert codes
    alertCode: ssi.alertCode || null,
    alertAcronym: ssi.alertAcronym || null,

    // Country
    country: ssi.country || ssi.registeredCountry || null
  };
}

/**
 * Check if SSI reference data is available in MongoDB.
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
  getSSIsByCounterpartyGroup,
  findBySsiId,

  // Trade generation
  selectSSIPair,
  isReferenceDataAvailable,
  getSettlementTypeRatio,

  // Security (new product-based lookups)
  getSecurityByProduct,
  getSecurityByProductType,
  getSecurityByCurrency,
  getSecurityCurrencies,
  getRandomSecurity,

  // Entity
  getRandomEntity,
  getUniqueEntityNames,
  getAllEntities,

  // Search
  findByAlertCodes,
  findByRefId,

  // Counterparty
  getAllCounterparties,

  // Cache control
  invalidateRefCache,

  // Helpers (exposed for testing)
  deriveSettlementType,
  createSnapshot
};
