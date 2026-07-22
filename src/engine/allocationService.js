// ======================================
// ALLOCATION SERVICE
// Drives what a learner sees when they enter the Reconciliation Desk.
//
// CONTRACT
//   On entry the desk must present exactly 20 settled trades worth of
//   reconciliation rows — 1 Ledger + 1 Statement each = 40 rows — mixed
//   together with NO visual pairing.
//
// IDEMPOTENCY (no extra collection)
//   "Allocation" is defined deterministically from the single
//   reconciliation_items collection: a trade is "reconcilable" when it
//   has BOTH a LEDGER item (itemRef1 = tradeRef) and a STATEMENT item
//   (ref5 = tradeRef). If ≥20 reconcilable trades already exist, we
//   simply return 40 of their rows — we never allocate or generate
//   again. This honours the "ONE new collection" requirement.
//
// AUTO-GENERATION (insufficient settled trades)
//   When fewer than 20 reconcilable trades exist, we generate the
//   shortfall as SETTLED trades and run each through the full downstream
//   lifecycle so it produces its Ledger + Statement pair:
//       generate (SETTLED) → save → Ledger item → SWIFT → Statement item
//   Generated trades are created with currentStatus = "SETTLED" and
//   assignedTo = null, so they NEVER appear in operational queues
//   (queues filter on the pending/break statuses only).
//
// This service reads/writes reconciliation data ONLY through the
// repository and reuses the existing trade + SWIFT engines untouched.
// ======================================

const Trade = require("../models/Trade");
const ReconciliationItem = require("../models/ReconciliationItem");
const repo = require("./reconciliationRepository");
const tradeGenerator = require("./tradeGenerator");
const ledgerImporter = require("./ledgerImporter");
const swift = require("./swift");
const { RECON_SOURCE, SETTLED_STATUS, ALLOCATION } = require("./reconciliationConstants");

// Bound the generation loop so a persistent SWIFT failure can never spin.
const MAX_GENERATION_ROUNDS = 5;
// How long to wait for the fire-and-forget statement item to land.
const STATEMENT_WAIT_MS = 4000;
const STATEMENT_POLL_MS = 200;

/**
 * Ensure a reconciliation allocation exists for the desk and return it.
 * Idempotent — repeated calls return the same 40-row allocation without
 * generating anything new once 20 reconcilable trades exist.
 *
 * @param {string} userId - The learner entering the desk (audit/context)
 * @returns {Promise<{ items, tradeCount, rowCount, settledTradeCount, generated }>}
 */
async function ensureAllocation(userId) {
  // 1. What is already reconcilable?
  let reconcilable = await getReconcilableTradeRefs();
  const settledTradeCount = await Trade.countDocuments({ currentStatus: SETTLED_STATUS });
  let generated = 0;

  // 2. Generate the shortfall, if any, as fully-settled trades.
  let round = 0;
  while (reconcilable.length < ALLOCATION.TARGET_TRADES && round < MAX_GENERATION_ROUNDS) {
    round++;
    const shortfall = ALLOCATION.TARGET_TRADES - reconcilable.length;
    console.log(`[Allocation] Round ${round}: ${reconcilable.length}/${ALLOCATION.TARGET_TRADES} reconcilable — generating ${shortfall} settled trade(s).`);

    const madeRefs = await generateSettledTrades(shortfall, userId);
    generated += madeRefs.length;

    reconcilable = await getReconcilableTradeRefs();
  }

  // 3. Select exactly TARGET_TRADES reconcilable trades (most recent first)
  //    and gather their 40 rows.
  const selectedRefs = reconcilable.slice(0, ALLOCATION.TARGET_TRADES);
  const rows = await gatherRows(selectedRefs);

  return {
    items: shuffle(rows),
    tradeCount: selectedRefs.length,
    rowCount: rows.length,
    settledTradeCount: settledTradeCount + generated,
    generated
  };
}

/**
 * Determine which settled trades are reconcilable (have BOTH a ledger and
 * a statement reconciliation item). Ordered most-recent-first for stable,
 * idempotent selection.
 *
 * @returns {Promise<string[]>} tradeRefs
 */
async function getReconcilableTradeRefs() {
  // Ledger tradeRefs (itemRef1) and Statement tradeRefs (ref5), newest first.
  const [ledgerRefs, statementRefs] = await Promise.all([
    ReconciliationItem.aggregate([
      { $match: { source: RECON_SOURCE.LEDGER, itemRef1: { $ne: null } } },
      { $group: { _id: "$itemRef1", createdAt: { $max: "$createdAt" } } },
      { $sort: { createdAt: -1 } }
    ]),
    ReconciliationItem.distinct("ref5", { source: RECON_SOURCE.STATEMENT, ref5: { $ne: null } })
  ]);

  const statementSet = new Set(statementRefs.map(String));

  // Preserve ledger recency ordering; keep only those with a statement too.
  return ledgerRefs
    .map(r => String(r._id))
    .filter(ref => statementSet.has(ref));
}

/**
 * Fetch all reconciliation rows (ledger + statement) for a set of tradeRefs.
 * Ledger rows key on itemRef1; statement rows key on ref5.
 */
async function gatherRows(tradeRefs) {
  if (!tradeRefs.length) return [];
  const rows = await ReconciliationItem.find({
    $or: [
      { source: RECON_SOURCE.LEDGER, itemRef1: { $in: tradeRefs } },
      { source: RECON_SOURCE.STATEMENT, ref5: { $in: tradeRefs } }
    ]
  }).lean();
  return rows;
}

/**
 * Generate N trades already in SETTLED state and drive each through the
 * downstream reconciliation lifecycle (Ledger item + SWIFT + Statement item).
 *
 * @param {number} count
 * @param {string} userId
 * @returns {Promise<string[]>} tradeRefs that ended up fully reconcilable
 */
async function generateSettledTrades(count, userId) {
  // Generate CLEAN settled trades (breakCount = 0) targeting the SETTLEMENT
  // desk with the forced initial state SETTLED. tradeGenerator applies this
  // as the clean status, and populates real SSI/entity data so SWIFT renders.
  const trades = await tradeGenerator.generateTrades(count, 0, "SETTLEMENT", SETTLED_STATUS);
  const saved = await tradeGenerator.saveGeneratedTrades(trades);

  // Create Ledger items directly (await — we need them present now).
  await ledgerImporter.importTradesAsLedgerItems(saved);

  const completed = [];
  for (const trade of saved) {
    try {
      // Generate SWIFT — its internal fire-and-forget hook creates the
      // Statement item. We then wait for that item to land.
      await swift.generateSwiftMessages(trade.tradeRef, userId || "SYSTEM");

      const ok = await waitForStatementItem(trade.tradeRef);
      if (ok) completed.push(trade.tradeRef);
      else console.warn(`[Allocation] No statement item for ${trade.tradeRef} (SWIFT may have failed validation).`);
    } catch (err) {
      console.warn(`[Allocation] Lifecycle error for ${trade.tradeRef}:`, err.message);
    }
  }

  return completed;
}

/**
 * Poll for the statement item created by the SWIFT fire-and-forget hook.
 */
async function waitForStatementItem(tradeRef) {
  const deadline = Date.now() + STATEMENT_WAIT_MS;
  while (Date.now() < deadline) {
    if (await repo.statementExistsForTrade(tradeRef)) return true;
    await sleep(STATEMENT_POLL_MS);
  }
  // Final check.
  return repo.statementExistsForTrade(tradeRef);
}

/**
 * Report current allocation status WITHOUT generating anything.
 * Used by GET /allocation to check for an existing allocation.
 */
async function getAllocationStatus() {
  const reconcilable = await getReconcilableTradeRefs();
  const allocated = reconcilable.length >= ALLOCATION.TARGET_TRADES;
  const selectedRefs = reconcilable.slice(0, ALLOCATION.TARGET_TRADES);
  const rows = allocated ? await gatherRows(selectedRefs) : [];

  return {
    allocated,
    tradeCount: selectedRefs.length,
    rowCount: rows.length,
    items: shuffle(rows)
  };
}

// ======================================
// UTILITIES
// ======================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fisher–Yates shuffle so Ledger and Statement rows appear mixed naturally
// with no positional pairing.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  ensureAllocation,
  getAllocationStatus,
  getReconcilableTradeRefs
};
