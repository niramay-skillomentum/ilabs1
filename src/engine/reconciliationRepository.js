// ======================================
// RECONCILIATION REPOSITORY
// The ONLY module that talks to the reconciliation_items collection
// directly. Every reconciliation service (creation, allocation,
// matching, query) flows through this single gateway.
//
// Why this exists (10x enterprise abstraction):
//   Decoupling the workstation and business services from MongoDB
//   lets us later introduce partial matching, one-to-many matching,
//   duplicate-statement handling, suspense items, reconciliation
//   profiles, and TLM-style auto-match rules WITHOUT touching the UI
//   or the business services. The query surface stays stable while
//   the storage strategy is free to evolve.
//
// This layer is intentionally "dumb": no business rules, no ID
// generation, no derivation. Pure persistence + query.
// ======================================

const ReconciliationItem = require("../models/ReconciliationItem");
const { RECON_SOURCE, RECON_STATUS } = require("./reconciliationConstants");

// ======================================
// WRITE OPERATIONS
// ======================================

/**
 * Persist a single reconciliation item.
 * @param {Object} doc - Fully-formed reconciliation item document
 * @returns {Promise<Object>} Created item (mongoose doc)
 */
async function createItem(doc) {
  return ReconciliationItem.create(doc);
}

/**
 * Atomically transition a pair of items to Matched with the same matchId.
 * Only flips items that are still Outstanding (optimistic guard) so a
 * concurrent match on either row cannot double-apply.
 *
 * @param {string} ledgerObjectId    - Mongo _id of the LEDGER item
 * @param {string} statementObjectId - Mongo _id of the STATEMENT item
 * @param {string} matchId           - Generated MATCHxxxxxx id
 * @returns {Promise<number>} Number of rows actually updated (expect 2)
 */
async function applyMatch(ledgerObjectId, statementObjectId, matchId) {
  const res = await ReconciliationItem.updateMany(
    {
      _id: { $in: [ledgerObjectId, statementObjectId] },
      status: RECON_STATUS.OUTSTANDING,
      matchId: null
    },
    { $set: { status: RECON_STATUS.MATCHED, matchId } }
  );
  return res.modifiedCount || 0;
}

/**
 * Reverse a match — return both items in a match group to Outstanding.
 * Reserved for future break/unmatch workflows.
 *
 * @param {string} matchId
 * @returns {Promise<number>} Rows updated
 */
async function clearMatch(matchId) {
  const res = await ReconciliationItem.updateMany(
    { matchId },
    { $set: { status: RECON_STATUS.OUTSTANDING, matchId: null } }
  );
  return res.modifiedCount || 0;
}

// ======================================
// READ OPERATIONS
// ======================================

/**
 * Find a single item by its business itemId (REC000001).
 */
async function findByItemId(itemId) {
  return ReconciliationItem.findOne({ itemId }).lean();
}

/**
 * Find a single item by Mongo _id.
 */
async function findById(objectId) {
  return ReconciliationItem.findById(objectId).lean();
}

/**
 * Generic filtered fetch with pagination.
 *
 * @param {Object} query   - Mongo query object (already built by caller)
 * @param {Object} options - { limit, skip, sort }
 * @returns {Promise<{items, total, hasMore}>}
 */
async function findByFilters(query = {}, options = {}) {
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 200, 1), 1000);
  const skip = Math.max(parseInt(options.skip, 10) || 0, 0);
  const sort = options.sort || { createdAt: -1 };

  const [items, total] = await Promise.all([
    ReconciliationItem.find(query).sort(sort).skip(skip).limit(limit + 1).lean(),
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
 * Fetch all items for a set of itemIds, preserving no particular order.
 */
async function findByItemIds(itemIds = []) {
  if (!itemIds.length) return [];
  return ReconciliationItem.find({ itemId: { $in: itemIds } }).lean();
}

/**
 * Fetch all Outstanding items for a given source.
 */
async function findOutstandingBySource(source) {
  return ReconciliationItem.find({
    status: RECON_STATUS.OUTSTANDING,
    source
  }).lean();
}

/**
 * Fetch the LEDGER item whose itemRef1 equals a given tradeRef.
 * (Ledger legitimately carries the tradeRef in itemRef1.)
 */
async function findLedgerByTradeRef(tradeRef) {
  return ReconciliationItem.findOne({
    source: RECON_SOURCE.LEDGER,
    itemRef1: tradeRef
  }).lean();
}

/**
 * Fetch the STATEMENT item whose ref5 (Field 20) equals a given tradeRef.
 * (Statement legitimately carries the tradeRef in the SWIFT Field 20.)
 */
async function findStatementByField20(tradeRef) {
  return ReconciliationItem.findOne({
    source: RECON_SOURCE.STATEMENT,
    ref5: tradeRef
  }).lean();
}

/**
 * Count items matching an arbitrary query.
 */
async function countByQuery(query = {}) {
  return ReconciliationItem.countDocuments(query);
}

/**
 * Whether a LEDGER item already exists for a tradeRef (idempotency guard).
 */
async function ledgerExistsForTrade(tradeRef) {
  const n = await ReconciliationItem.countDocuments({
    source: RECON_SOURCE.LEDGER,
    itemRef1: tradeRef
  });
  return n > 0;
}

/**
 * Whether a STATEMENT item already exists for a tradeRef (idempotency guard).
 * Keyed on ref5 (Field 20) which is SWIFT-sourced.
 */
async function statementExistsForTrade(tradeRef) {
  const n = await ReconciliationItem.countDocuments({
    source: RECON_SOURCE.STATEMENT,
    ref5: tradeRef
  });
  return n > 0;
}

// ======================================
// AGGREGATION / STATS
// ======================================

/**
 * Dashboard statistics for the reconciliation desk.
 */
async function getStats() {
  const [
    totalItems, matchedItems, outstandingItems,
    ledgerItems, statementItems, byDesk, byCurrency
  ] = await Promise.all([
    ReconciliationItem.countDocuments({}),
    ReconciliationItem.countDocuments({ status: RECON_STATUS.MATCHED }),
    ReconciliationItem.countDocuments({ status: RECON_STATUS.OUTSTANDING }),
    ReconciliationItem.countDocuments({ source: RECON_SOURCE.LEDGER }),
    ReconciliationItem.countDocuments({ source: RECON_SOURCE.STATEMENT }),
    ReconciliationItem.aggregate([
      { $group: {
        _id: "$reconDesk",
        total: { $sum: 1 },
        matched: { $sum: { $cond: [{ $eq: ["$status", RECON_STATUS.MATCHED] }, 1, 0] } },
        outstanding: { $sum: { $cond: [{ $eq: ["$status", RECON_STATUS.OUTSTANDING] }, 1, 0] } }
      }},
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
    totalItems, matchedItems, outstandingItems,
    ledgerItems, statementItems, matchRate, byDesk, byCurrency
  };
}

/**
 * All match pairs grouped by matchId.
 */
async function getMatchPairs(options = {}) {
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 100, 1), 500);
  const skip = Math.max(parseInt(options.skip, 10) || 0, 0);

  return ReconciliationItem.aggregate([
    { $match: { status: RECON_STATUS.MATCHED, matchId: { $ne: null } } },
    { $group: { _id: "$matchId", items: { $push: "$$ROOT" }, matchedAt: { $max: "$updatedAt" } } },
    { $sort: { matchedAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);
}

module.exports = {
  // writes
  createItem,
  applyMatch,
  clearMatch,
  // reads
  findByItemId,
  findById,
  findByFilters,
  findByItemIds,
  findOutstandingBySource,
  findLedgerByTradeRef,
  findStatementByField20,
  countByQuery,
  ledgerExistsForTrade,
  statementExistsForTrade,
  // aggregation
  getStats,
  getMatchPairs
};
