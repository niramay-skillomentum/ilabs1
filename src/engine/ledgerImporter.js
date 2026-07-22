// ======================================
// LEDGER CREATION SERVICE (a.k.a. Ledger Importer)
// Creates Ledger Reconciliation Items from Trade Objects.
//
// Fired fire-and-forget after trade generation (queueComposer).
// NEVER modifies the Trade Object. NEVER blocks the trade flow.
//
// Data-independence contract:
//   - Populates ONLY from the Trade Object.
//   - SWIFT references (ref1–ref8) MUST remain NULL on ledger items.
//
// For each trade → ONE ReconciliationItem { source: LEDGER,
// status: Outstanding, matchId: null }.
// ======================================

const repo = require("./reconciliationRepository");
const reconService = require("./reconciliationService");
const { RECON_SOURCE, RECON_STATUS } = require("./reconciliationConstants");

/**
 * Import an array of saved trades as Ledger Reconciliation Items.
 * Fire-and-forget — errors are logged, never propagated.
 *
 * @param {Object[]} trades - Array of saved trade documents
 */
async function importTradesAsLedgerItems(trades) {
  if (!trades || trades.length === 0) return;

  let created = 0;
  let skipped = 0;

  for (const trade of trades) {
    try {
      // Idempotency: never create a second ledger item for the same trade.
      if (await repo.ledgerExistsForTrade(trade.tradeRef)) {
        skipped++;
        continue;
      }
      await createLedgerItem(trade);
      created++;
    } catch (err) {
      if (err.code === 11000) { skipped++; continue; }
      console.warn(`[LedgerCreation] Error creating ledger item for ${trade.tradeRef}:`, err.message);
    }
  }

  if (created > 0) {
    console.log(`[LedgerCreation] Created ${created} ledger items (${skipped} skipped)`);
  }
}

/**
 * Create a single Ledger Reconciliation Item from a trade.
 * Populated ONLY from the Trade Object.
 *
 * @param {Object} trade - Trade document (plain object or mongoose doc)
 * @returns {Promise<Object>} Created ReconciliationItem
 */
async function createLedgerItem(trade) {
  const itemId = await reconService.generateItemId();

  return repo.createItem({
    itemId,
    status: RECON_STATUS.OUTSTANDING,
    source: RECON_SOURCE.LEDGER,
    itemType: reconService.deriveItemType(RECON_SOURCE.LEDGER, trade.direction),

    // Trade economics (trade-sourced)
    amount: trade.amount,
    currency: trade.currency,
    tradeDate: trade.tradeDate,
    valueDate: trade.valueDate,

    // Recon desk derived from FO Region (trade-level attribute)
    reconDesk: reconService.deriveReconDesk(trade.foRegion),

    matchId: null,

    // Item References (trade-level) — the ledger legitimately carries these.
    itemRef1: trade.tradeRef || null,   // Trade ID
    itemRef2: trade.underlyer || null,  // Underlyer
    itemRef3: trade.entity || null,     // Entity Code
    itemRef4: trade.truths?.settlement?.country || null, // Country
    itemRef5: trade.product || null,    // Product
    itemRef6: trade.productType || null, // Product Type

    // SWIFT References — MUST remain NULL for ledger items.
    ref1: null, ref2: null, ref3: null, ref4: null,
    ref5: null, ref6: null, ref7: null, ref8: null
  });
}

module.exports = {
  importTradesAsLedgerItems,
  createLedgerItem
};
