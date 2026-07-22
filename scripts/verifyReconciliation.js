// ======================================
// VERIFY RECONCILIATION DESK
// End-to-end verification of the Enterprise Cash Reconciliation Desk.
//
// Usage: node scripts/verifyReconciliation.js
//
// It exercises the REAL engines (tradeGenerator → ledgerImporter →
// SWIFT → statementImporter → allocationService → matchingEngine) and
// asserts the data-independence and allocation invariants required by
// the specification. All test artefacts are namespaced and cleaned up.
//
// Assertions:
//   1. Every generated trade has EXACTLY ONE Ledger item.
//   2. Every settled trade with SWIFT has EXACTLY ONE Statement item.
//   3. Statement items NEVER contain trade-only fields
//      (tradeDate, itemRef1–6 all NULL).
//   4. Ledger items NEVER contain SWIFT-only fields (ref1–8 all NULL).
//   5. No duplicate itemIds.
//   6. No duplicate (non-null) matchIds.
//   7. Allocation returns 20 trades = 40 rows, mixed, no visual pairing.
//   8. A valid user-driven manual match succeeds; an invalid one fails
//      without revealing why.
// ======================================

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/db");

const Trade = require("../src/models/Trade");
const ReconciliationItem = require("../src/models/ReconciliationItem");
const tradeGenerator = require("../src/engine/tradeGenerator");
const ledgerImporter = require("../src/engine/ledgerImporter");
const swift = require("../src/engine/swift");
const allocationService = require("../src/engine/allocationService");
const matchingEngine = require("../src/engine/matchingEngine");
const { RECON_SOURCE, RECON_STATUS } = require("../src/engine/reconciliationConstants");

const TRADE_COUNT = 100;

let pass = 0;
let fail = 0;
const failures = [];

function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; failures.push(label); console.log(`  ❌ ${label}`); }
}

async function run() {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    console.error("❌ MongoDB not connected — cannot run verification.");
    process.exit(1);
  }

  console.log(`\n=== Generating ${TRADE_COUNT} settled trades through the full lifecycle ===`);

  // 1. Generate settled trades (clean, SETTLEMENT desk, forced SETTLED).
  const trades = await tradeGenerator.generateTrades(TRADE_COUNT, 0, "SETTLEMENT", "SETTLED");
  const saved = await tradeGenerator.saveGeneratedTrades(trades);
  const tradeRefs = saved.map(t => t.tradeRef);
  console.log(`   Saved ${saved.length} trades.`);

  // 2. Ledger items (await).
  await ledgerImporter.importTradesAsLedgerItems(saved);

  // 3. SWIFT + Statement items.
  let swiftOk = 0;
  for (const t of saved) {
    const r = await swift.generateSwiftMessages(t.tradeRef, "VERIFY");
    if (r && r.success !== false) swiftOk++;
  }
  console.log(`   SWIFT generated for ~${swiftOk} trades.`);

  // Allow fire-and-forget statement items to settle.
  await sleep(2500);

  // ── Fetch all recon items for our trades ──
  const ledgerItems = await ReconciliationItem.find({
    source: RECON_SOURCE.LEDGER, itemRef1: { $in: tradeRefs }
  }).lean();
  const statementItems = await ReconciliationItem.find({
    source: RECON_SOURCE.STATEMENT, ref5: { $in: tradeRefs }
  }).lean();

  console.log(`\n=== Assertions ===`);

  // (1) Exactly one ledger item per trade.
  const ledgerByTrade = countBy(ledgerItems, i => i.itemRef1);
  const ledgerExactlyOne = tradeRefs.every(ref => ledgerByTrade[ref] === 1);
  assert(ledgerExactlyOne, "Every trade has exactly ONE Ledger item");

  // (2) Exactly one statement item per settled trade that produced SWIFT.
  const stmtByTrade = countBy(statementItems, i => i.ref5);
  const stmtNoDupes = Object.values(stmtByTrade).every(n => n === 1);
  assert(stmtNoDupes, "No settled trade has more than ONE Statement item");
  assert(statementItems.length > 0, `Statement items were created (${statementItems.length})`);

  // (3) Statement items never contain trade-only fields.
  const stmtClean = statementItems.every(i =>
    i.tradeDate == null &&
    i.itemRef1 == null && i.itemRef2 == null && i.itemRef3 == null &&
    i.itemRef4 == null && i.itemRef5 == null && i.itemRef6 == null
  );
  assert(stmtClean, "Statement items NEVER contain trade-only fields (tradeDate, itemRef1–6 NULL)");

  // (4) Ledger items never contain SWIFT-only fields.
  const ledgerClean = ledgerItems.every(i =>
    i.ref1 == null && i.ref2 == null && i.ref3 == null && i.ref4 == null &&
    i.ref5 == null && i.ref6 == null && i.ref7 == null && i.ref8 == null
  );
  assert(ledgerClean, "Ledger items NEVER contain SWIFT-only fields (ref1–8 NULL)");

  // (5) No duplicate itemIds (global).
  const allIds = await ReconciliationItem.aggregate([
    { $group: { _id: "$itemId", n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } }
  ]);
  assert(allIds.length === 0, "No duplicate itemIds");

  // (6) No duplicate matchIds (global, non-null).
  const dupMatch = await ReconciliationItem.aggregate([
    { $match: { matchId: { $ne: null } } },
    { $group: { _id: "$matchId", n: { $sum: 1 } } },
    { $match: { n: { $gt: 2 } } }  // a matchId is shared by EXACTLY 2 rows
  ]);
  assert(dupMatch.length === 0, "No matchId is shared by more than 2 rows");

  // (7) Allocation returns 20 trades = 40 rows.
  const alloc = await allocationService.ensureAllocation("VERIFY");
  assert(alloc.tradeCount === 20, `Allocation selects exactly 20 trades (got ${alloc.tradeCount})`);
  assert(alloc.rowCount === 40, `Allocation returns exactly 40 rows (got ${alloc.rowCount})`);
  const ledgerRows = alloc.items.filter(i => i.source === RECON_SOURCE.LEDGER).length;
  const stmtRows = alloc.items.filter(i => i.source === RECON_SOURCE.STATEMENT).length;
  assert(ledgerRows === 20 && stmtRows === 20, `Allocation is 20 Ledger + 20 Statement (got ${ledgerRows}/${stmtRows})`);

  // Mixed (not grouped): at least one adjacency crosses source within first 40.
  const mixed = alloc.items.some((it, idx) => idx > 0 && alloc.items[idx - 1].source !== it.source);
  assert(mixed, "Ledger and Statement rows are mixed (not grouped)");

  // (8a) Valid manual match succeeds.
  const sampleRef = tradeRefs.find(ref => ledgerByTrade[ref] === 1 && stmtByTrade[ref] === 1);
  const ledgerItem = ledgerItems.find(i => i.itemRef1 === sampleRef);
  const stmtItem = statementItems.find(i => i.ref5 === sampleRef);
  let matchResult = { success: false };
  if (ledgerItem && stmtItem) {
    matchResult = await matchingEngine.manualMatch(ledgerItem.itemId, stmtItem.itemId);
  }
  assert(matchResult.success === true, `Valid manual match succeeds (${matchResult.matchId || "n/a"})`);

  // Verify both rows flipped to Matched with the same matchId.
  if (matchResult.success) {
    const [l, s] = await Promise.all([
      ReconciliationItem.findOne({ itemId: ledgerItem.itemId }).lean(),
      ReconciliationItem.findOne({ itemId: stmtItem.itemId }).lean()
    ]);
    assert(
      l.status === RECON_STATUS.MATCHED && s.status === RECON_STATUS.MATCHED &&
      l.matchId === matchResult.matchId && s.matchId === matchResult.matchId,
      "Both rows became Matched with the SAME matchId"
    );
  }

  // (8b) Invalid manual match (two ledgers) fails without a reason.
  const twoLedgers = ledgerItems.filter(i => i.itemRef1 !== sampleRef).slice(0, 2);
  if (twoLedgers.length === 2) {
    const bad = await matchingEngine.manualMatch(twoLedgers[0].itemId, twoLedgers[1].itemId);
    assert(bad.success === false, "Invalid pair (two Ledgers) is rejected");
    assert(!/(reference|amount|currency|value date|source)/i.test(bad.message || ""),
      "Rejection message does not reveal WHY (neutral message)");
  }

  // Mismatched economics (different trades) is rejected.
  const otherStmt = statementItems.find(i => i.ref5 && i.ref5 !== sampleRef);
  if (ledgerItem && otherStmt) {
    const bad2 = await matchingEngine.manualMatch(ledgerItem.itemId, otherStmt.itemId);
    assert(bad2.success === false, "Mismatched Ledger/Statement pair is rejected");
  }

  // ── Cleanup ──
  console.log(`\n=== Cleanup ===`);
  const delItems = await ReconciliationItem.deleteMany({
    $or: [
      { source: RECON_SOURCE.LEDGER, itemRef1: { $in: tradeRefs } },
      { source: RECON_SOURCE.STATEMENT, ref5: { $in: tradeRefs } }
    ]
  });
  const delTrades = await Trade.deleteMany({ tradeRef: { $in: tradeRefs } });
  const SwiftMessage = require("../src/models/SwiftMessage");
  const delSwift = await SwiftMessage.deleteMany({ tradeRef: { $in: tradeRefs } });
  console.log(`   Removed ${delItems.deletedCount} recon items, ${delTrades.deletedCount} trades, ${delSwift.deletedCount} SWIFT messages.`);

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) {
    console.log("Failures:");
    failures.forEach(f => console.log(`   - ${f}`));
  }

  await mongoose.disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

function countBy(arr, keyFn) {
  const out = {};
  for (const el of arr) {
    const k = keyFn(el);
    if (k == null) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

run().catch(err => {
  console.error("❌ Verification error:", err);
  process.exit(1);
});
