// ======================================
// LEDGER IMPORTER
// Creates Ledger Reconciliation Items from Trade Objects.
//
// Called fire-and-forget after trade generation (queueComposer).
// Never modifies the Trade Object.
// Never blocks the trade generation flow.
//
// For each trade:
//   - Creates ONE ReconciliationItem with source = "LEDGER"
//   - Status = "Outstanding"
//   - MatchId = null
//   - SWIFT refs (ref1-ref8) = null
// ======================================

const ReconciliationItem = require("../models/ReconciliationItem");
const reconService = require("./reconciliationService");

/**
 * Import an array of saved trades as Ledger Reconciliation Items.
 * Fire-and-forget — errors are logged but never propagated.
 *
 * @param {Object[]} trades - Array of saved trade documents
 */
async function importTradesAsLedgerItems(trades) {
  if (!trades || trades.length === 0) return;

  let created = 0;
  let skipped = 0;

  for (const trade of trades) {
    try {
      await createLedgerItem(trade);
      created++;
    } catch (err) {
      // Skip duplicates (same tradeRef already imported)
      if (err.code === 11000) {
        skipped++;
        continue;
      }
      console.warn(`[LedgerImporter] Error creating ledger item for ${trade.tradeRef}:`, err.message);
    }
  }

  if (created > 0) {
    console.log(`[LedgerImporter] Created ${created} ledger items (${skipped} skipped)`);
  }
}

/**
 * Create a single Ledger Reconciliation Item from a trade.
 *
 * @param {Object} trade - Trade document (plain object or mongoose doc)
 * @returns {Promise<Object>} Created ReconciliationItem
 */
async function createLedgerItem(trade) {
  const itemId = await reconService.generateItemId();

  const item = await ReconciliationItem.create({
    itemId,
    status: "Outstanding",
    source: "LEDGER",
    itemType: reconService.deriveItemType("LEDGER", trade.direction),

    // Trade economics
    amount: trade.amount,
    currency: trade.currency,
    tradeDate: trade.tradeDate,
    valueDate: trade.valueDate,

    // Recon desk (derived from FO Region)
    reconDesk: reconService.deriveReconDesk(trade.foRegion),

    // Match ID — null until matched
    matchId: null,

    // Item References (trade-level)
    itemRef1: trade.tradeRef || null,
    itemRef2: trade.underlyer || null,
    itemRef3: trade.entity || null,
    itemRef4: trade.truths?.settlement?.country || null,
    itemRef5: trade.product || null,
    itemRef6: trade.productType || null,

    // SWIFT References — must remain NULL for ledger items
    ref1: null,
    ref2: null,
    ref3: null,
    ref4: null,
    ref5: null,
    ref6: null,
    ref7: null,
    ref8: null
  });

  return item;
}

module.exports = {
  importTradesAsLedgerItems,
  createLedgerItem
};
