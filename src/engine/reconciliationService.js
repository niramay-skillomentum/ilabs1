// ======================================
// RECONCILIATION SERVICE
// Business-logic orchestration for the Reconciliation Desk.
//
// Owns the domain rules that are NOT pure persistence:
//   - Atomic ID generation (REC000001, MATCH000001)
//   - Recon Desk derivation (from FO Region for ledger,
//     from SWIFT BIC for statement)
//   - Item Type derivation (from source + direction)
//   - Query / statistics facade (delegates to the repository)
//
// All data access is delegated to reconciliationRepository so this
// service never talks to Mongo directly (except the ID counter,
// which is an infrastructure concern local to this module).
//
// Stateless — all durable state lives in MongoDB.
// ======================================

const mongoose = require("mongoose");
const repo = require("./reconciliationRepository");
const ReconciliationConfig = require("../models/ReconciliationConfig");
const {
  RECON_SOURCE,
  RECON_ITEM_TYPE,
  RECON_DESK,
  REGION_TO_DESK,
  ID_FORMAT,
  COUNTER_KEYS,
  SWIFT_DIRECTION
} = require("./reconciliationConstants");

// ======================================
// ATOMIC ID GENERATION
// MongoDB findOneAndUpdate + upsert → thread-safe counter.
// ======================================

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.ReconCounter || mongoose.model("ReconCounter", CounterSchema);

async function nextSeq(key) {
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return counter.seq;
}

/** Generate the next reconciliation item ID (REC000001, ...). */
async function generateItemId() {
  const seq = await nextSeq(COUNTER_KEYS.ITEM);
  return `${ID_FORMAT.ITEM_PREFIX}${String(seq).padStart(ID_FORMAT.PAD_WIDTH, "0")}`;
}

/** Generate the next match ID (MATCH000001, ...). */
async function generateMatchId() {
  const seq = await nextSeq(COUNTER_KEYS.MATCH);
  return `${ID_FORMAT.MATCH_PREFIX}${String(seq).padStart(ID_FORMAT.PAD_WIDTH, "0")}`;
}

// ======================================
// RECON DESK DERIVATION
// ======================================

/**
 * Derive reconciliation desk from FO Region (LEDGER path).
 * Region is a trade-level attribute → legitimate for the ledger.
 */
function deriveReconDesk(foRegion) {
  if (!foRegion) return RECON_DESK.GLOBAL;
  const region = String(foRegion).toUpperCase().trim();
  return REGION_TO_DESK[region] || RECON_DESK.GLOBAL;
}

/**
 * Derive reconciliation desk from a SWIFT BIC (STATEMENT path).
 * The country code (characters 5–6 of the BIC) maps to a region.
 * This uses ONLY data present inside the SWIFT message — never the trade.
 *
 * @param {string} bic - Sender or receiver BIC from the SWIFT message
 * @returns {string} Recon desk
 */
function deriveReconDeskFromBIC(bic) {
  const code = String(bic || "").toUpperCase().trim();
  if (code.length < 6) return RECON_DESK.GLOBAL;

  const country = code.substring(4, 6);
  return countryToDesk(country);
}

// ISO country → region desk. Deliberately compact; unknown → GLOBAL.
const APAC = new Set(["AU", "NZ", "JP", "CN", "HK", "SG", "IN", "KR", "TW", "TH", "MY", "ID", "PH", "VN"]);
const EMEA = new Set(["GB", "DE", "FR", "CH", "NL", "SE", "NO", "DK", "FI", "IT", "ES", "IE", "BE", "AT", "LU", "PL", "PT", "ZA", "AE", "SA", "RU", "TR"]);
const AMER = new Set(["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE"]);

function countryToDesk(country) {
  if (APAC.has(country)) return RECON_DESK.APAC;
  if (EMEA.has(country)) return RECON_DESK.EMEA;
  if (AMER.has(country)) return RECON_DESK.AMER;
  return RECON_DESK.GLOBAL;
}

// ======================================
// ITEM TYPE DERIVATION
// ======================================

/**
 * Derive item type from source + direction.
 * For LEDGER, direction is the trade direction.
 * For STATEMENT, direction is the SWIFT paymentDirection (PAY/RECEIVE).
 */
function deriveItemType(source, direction) {
  const dir = String(direction || "").toUpperCase().trim();
  const isDebit = dir === "SELL" || dir === "PAY";

  if (source === RECON_SOURCE.LEDGER) {
    return isDebit ? RECON_ITEM_TYPE.LEDGER_DEBIT : RECON_ITEM_TYPE.LEDGER_CREDIT;
  }
  if (source === RECON_SOURCE.STATEMENT) {
    return isDebit ? RECON_ITEM_TYPE.STATEMENT_DEBIT : RECON_ITEM_TYPE.STATEMENT_CREDIT;
  }
  return RECON_ITEM_TYPE.LEDGER_CREDIT;
}

/**
 * Derive statement item type directly from the SWIFT paymentDirection.
 * Uses ONLY the SWIFT message (never the trade).
 */
function deriveStatementItemType(paymentDirection) {
  const dir = String(paymentDirection || "").toUpperCase().trim();
  const isDebit = dir === SWIFT_DIRECTION.PAY;
  return isDebit ? RECON_ITEM_TYPE.STATEMENT_DEBIT : RECON_ITEM_TYPE.STATEMENT_CREDIT;
}

// ======================================
// QUERY FACADE (delegates to repository)
// ======================================

/**
 * Get reconciliation items with optional filtering.
 * @param {Object} filters - { status, source, reconDesk, currency, tradeRef, matchId }
 * @param {Object} options - { limit, skip, sort }
 */
async function getItems(filters = {}, options = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.source) query.source = filters.source;
  if (filters.reconDesk) query.reconDesk = filters.reconDesk;
  if (filters.currency) query.currency = filters.currency;
  if (filters.tradeRef) query.itemRef1 = filters.tradeRef;
  if (filters.matchId) query.matchId = filters.matchId;
  return repo.findByFilters(query, options);
}

async function getItemById(itemId) {
  return repo.findByItemId(itemId);
}

async function getStats() {
  return repo.getStats();
}

async function getMatches(options = {}) {
  return repo.getMatchPairs(options);
}

async function getActiveConfig() {
  return ReconciliationConfig.findOne({ active: true }).lean();
}

// ======================================
// SYNC & BACKFILL (Ledger + Statements)
// ======================================

/**
 * Synchronize the database by backfilling missing Ledger and Statement items.
 * Safe to run multiple times (idempotent).
 */
async function syncLedgerAndStatements() {
  console.log("[ReconSync] Starting ledger and statement backfill...");
  
  const Trade = require("../models/Trade");
  const SwiftMessage = require("../models/SwiftMessage");
  const ledgerImporter = require("./ledgerImporter");
  const statementImporter = require("./statementImporter");
  const swiftEngine = require("./swift/SwiftEngine");

  // 1. Ledger Sync
  const allTrades = await Trade.find({}).lean();
  console.log(`[ReconSync] Found ${allTrades.length} trades for ledger sync.`);
  await ledgerImporter.importTradesAsLedgerItems(allTrades);

  // 2. Statement Sync
  const settledTrades = allTrades.filter(t => t.currentStatus === "SETTLED");
  console.log(`[ReconSync] Found ${settledTrades.length} SETTLED trades for statement sync.`);

  let statementsCreated = 0;
  for (const trade of settledTrades) {
    let messages = await SwiftMessage.find({ tradeRef: trade.tradeRef, status: "GENERATED" }).lean();
    
    // If no SWIFT messages exist, generate them now (this will auto-create statement)
    if (messages.length === 0) {
      console.log(`[ReconSync] Generating missing SWIFTs for ${trade.tradeRef}...`);
      await swiftEngine.generateSwiftMessages(trade.tradeRef, "SYSTEM");
    } else {
      // SWIFTs exist, let's just make sure statement exists
      const primaryMsg = messages.find(m => m.messageType === "MT103") || messages[0];
      if (primaryMsg) {
        // statementImporter handles idempotency internally via repo
        await statementImporter.createStatementItem(primaryMsg, trade);
        statementsCreated++;
      }
    }
  }

  console.log(`[ReconSync] Statement sync complete. Evaluated ${settledTrades.length} trades.`);
  return { tradesScanned: allTrades.length, settledTrades: settledTrades.length };
}

module.exports = {
  generateItemId,
  generateMatchId,
  deriveReconDesk,
  deriveReconDeskFromBIC,
  deriveItemType,
  deriveStatementItemType,
  getItems,
  getItemById,
  getStats,
  getMatches,
  getActiveConfig,
  syncLedgerAndStatements
};
