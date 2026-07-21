// ======================================
// RECONCILIATION SERVICE
// Central orchestration service for the Reconciliation Desk.
// Provides:
//   - Atomic ID generation (REC000001, MATCH000001)
//   - Recon Desk derivation from FO Region
//   - Item Type derivation from source + direction
//   - Query and statistics helpers
//
// This service is stateless — all state lives in MongoDB.
// ======================================

const ReconciliationItem = require("../models/ReconciliationItem");
const ReconciliationConfig = require("../models/ReconciliationConfig");

// ======================================
// ATOMIC ID GENERATION
// Uses MongoDB findOneAndUpdate with upsert to create
// a thread-safe auto-incrementing counter.
// ======================================

const mongoose = require("mongoose");

// Lightweight counter schema (reused for both itemId and matchId)
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.ReconCounter || mongoose.model("ReconCounter", CounterSchema);

/**
 * Generate the next reconciliation item ID.
 * Format: REC000001, REC000002, ...
 */
async function generateItemId() {
  const counter = await Counter.findOneAndUpdate(
    { _id: "reconciliation_item" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `REC${String(counter.seq).padStart(6, "0")}`;
}

/**
 * Generate the next match ID.
 * Format: MATCH000001, MATCH000002, ...
 */
async function generateMatchId() {
  const counter = await Counter.findOneAndUpdate(
    { _id: "reconciliation_match" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `MATCH${String(counter.seq).padStart(6, "0")}`;
}

// ======================================
// RECON DESK DERIVATION
// Maps FO Region to Reconciliation Desk
// ======================================

const REGION_TO_DESK = {
  "APAC": "APAC.Cash",
  "EMEA": "EMEA.Cash",
  "AMER": "AMER.Cash"
};

/**
 * Derive reconciliation desk from FO Region.
 * Falls back to "GLOBAL.Cash" if region is unknown.
 *
 * @param {string} foRegion - FO Region from trade (e.g., "APAC", "EMEA", "AMER")
 * @returns {string} Reconciliation desk name
 */
function deriveReconDesk(foRegion) {
  if (!foRegion) return "GLOBAL.Cash";
  const region = String(foRegion).toUpperCase().trim();
  return REGION_TO_DESK[region] || "GLOBAL.Cash";
}

// ======================================
// ITEM TYPE DERIVATION
// Auto-derives from source + trade direction
// ======================================

/**
 * Derive item type from source and trade direction.
 *
 * @param {string} source    - "LEDGER" or "STATEMENT"
 * @param {string} direction - Trade direction ("BUY" or "SELL")
 * @returns {string} Item type
 */
function deriveItemType(source, direction) {
  const dir = String(direction || "").toUpperCase().trim();
  const isBuy = dir === "BUY" || dir === "PAY";

  if (source === "LEDGER") {
    return isBuy ? "Ledger Debit" : "Ledger Credit";
  }
  if (source === "STATEMENT") {
    return isBuy ? "Statement Debit" : "Statement Credit";
  }
  return "Ledger Credit"; // Fallback
}

// ======================================
// QUERY HELPERS
// ======================================

/**
 * Get reconciliation items with optional filtering.
 *
 * @param {Object} filters - { status, source, reconDesk, currency, tradeRef, matchId }
 * @param {Object} options - { limit, skip, sort }
 * @returns {Promise<Object>} { items, total, hasMore }
 */
async function getItems(filters = {}, options = {}) {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.source) query.source = filters.source;
  if (filters.reconDesk) query.reconDesk = filters.reconDesk;
  if (filters.currency) query.currency = filters.currency;
  if (filters.tradeRef) query.itemRef1 = filters.tradeRef;
  if (filters.matchId) query.matchId = filters.matchId;

  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 200, 1), 1000);
  const skip = Math.max(parseInt(options.skip, 10) || 0, 0);
  const sort = options.sort || { createdAt: -1 };

  const [items, total] = await Promise.all([
    ReconciliationItem.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit + 1)
      .lean(),
    ReconciliationItem.countDocuments(query)
  ]);

  const hasMore = items.length > limit;

  return {
    items: hasMore ? items.slice(0, limit) : items,
    total,
    hasMore
  };
}

/**
 * Get a single reconciliation item by itemId.
 */
async function getItemById(itemId) {
  return ReconciliationItem.findOne({ itemId }).lean();
}

/**
 * Get reconciliation statistics for the dashboard.
 */
async function getStats() {
  const [
    totalItems,
    matchedItems,
    outstandingItems,
    ledgerItems,
    statementItems,
    byDesk,
    byCurrency
  ] = await Promise.all([
    ReconciliationItem.countDocuments({}),
    ReconciliationItem.countDocuments({ status: "Matched" }),
    ReconciliationItem.countDocuments({ status: "Outstanding" }),
    ReconciliationItem.countDocuments({ source: "LEDGER" }),
    ReconciliationItem.countDocuments({ source: "STATEMENT" }),
    ReconciliationItem.aggregate([
      { $group: { _id: "$reconDesk", total: { $sum: 1 }, matched: { $sum: { $cond: [{ $eq: ["$status", "Matched"] }, 1, 0] } }, outstanding: { $sum: { $cond: [{ $eq: ["$status", "Outstanding"] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]),
    ReconciliationItem.aggregate([
      { $group: { _id: "$currency", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ])
  ]);

  const matchRate = totalItems > 0 ? Math.round((matchedItems / totalItems) * 100) : 0;

  return {
    totalItems,
    matchedItems,
    outstandingItems,
    ledgerItems,
    statementItems,
    matchRate,
    byDesk,
    byCurrency
  };
}

/**
 * Get all match pairs (matched items grouped by matchId).
 */
async function getMatches(options = {}) {
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 500);
  const skip = Math.max(parseInt(options.skip, 10) || 0, 0);

  const matches = await ReconciliationItem.aggregate([
    { $match: { status: "Matched", matchId: { $ne: null } } },
    { $group: {
      _id: "$matchId",
      items: { $push: "$$ROOT" },
      matchedAt: { $max: "$updatedAt" }
    }},
    { $sort: { matchedAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);

  return matches;
}

/**
 * Get the active matching configuration.
 */
async function getActiveConfig() {
  return ReconciliationConfig.findOne({ active: true }).lean();
}

module.exports = {
  generateItemId,
  generateMatchId,
  deriveReconDesk,
  deriveItemType,
  getItems,
  getItemById,
  getStats,
  getMatches,
  getActiveConfig
};
