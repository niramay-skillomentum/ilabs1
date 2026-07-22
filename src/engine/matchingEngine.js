// ======================================
// MATCHING ENGINE / MATCHING SERVICE
// Owns the RECONCILIATION matching operations.
//
// TWO matching modes:
//
//   1. manualMatch(ledgerItemId, statementItemId)  ← PRIMARY (user-driven)
//      The workstation sends a user-selected (Ledger, Statement) pair.
//      The engine asks the hidden ValidationService for a verdict and,
//      if valid, generates a MATCH id and flips BOTH rows to Matched.
//      The caller learns only success/failure — never the reason.
//
//   2. runMatching()                                ← LEGACY (auto batch)
//      Preserved for backward compatibility and potential future
//      auto-match rules. NOT exposed in the reconciliation workstation.
//
// All data access goes through reconciliationRepository. Validation
// logic lives in reconciliationValidationService (kept hidden).
// ======================================

const repo = require("./reconciliationRepository");
const reconService = require("./reconciliationService");
const validationService = require("./reconciliationValidationService");
const ReconciliationConfig = require("../models/ReconciliationConfig");
const { RECON_SOURCE, RECON_STATUS } = require("./reconciliationConstants");

// ======================================
// PRIMARY: MANUAL, USER-DRIVEN MATCH
// ======================================

/**
 * Attempt to match a user-selected Ledger + Statement pair.
 * The two itemIds may be supplied in EITHER order.
 *
 * @param {string} itemIdA - itemId of one selected row
 * @param {string} itemIdB - itemId of the other selected row
 * @returns {Promise<{ success: boolean, matchId?: string, message: string }>}
 */
async function manualMatch(itemIdA, itemIdB) {
  if (!itemIdA || !itemIdB || itemIdA === itemIdB) {
    return fail("Select one Ledger and one Statement item.");
  }

  const [a, b] = await Promise.all([
    repo.findByItemId(itemIdA),
    repo.findByItemId(itemIdB)
  ]);

  if (!a || !b) {
    return fail("Items cannot be matched.");
  }

  // Ask the hidden validation service for a verdict.
  const verdict = validationService.validatePair(a, b);
  if (!verdict.valid) {
    // Reason is logged internally but NEVER returned to the user.
    console.log(`[MatchingService] Manual match rejected (${a.itemId} / ${b.itemId}): ${verdict.reason}`);
    return fail("Items cannot be matched.");
  }

  // Resolve which is ledger / statement for the ordered update.
  const ledger = a.source === RECON_SOURCE.LEDGER ? a : b;
  const statement = a.source === RECON_SOURCE.STATEMENT ? a : b;

  const matchId = await reconService.generateMatchId();
  const modified = await repo.applyMatch(ledger._id, statement._id, matchId);

  // applyMatch only flips rows that were still Outstanding; if a
  // concurrent request already matched one of them, modified < 2.
  if (modified < 2) {
    return fail("Items cannot be matched.");
  }

  console.log(`[MatchingService] Manual match: ${ledger.itemId} ↔ ${statement.itemId} → ${matchId}`);
  return {
    success: true,
    matchId,
    ledgerItemId: ledger.itemId,
    statementItemId: statement.itemId,
    message: "Match successful."
  };
}

/**
 * Reverse a match (return both rows to Outstanding).
 * Reserved for future break/unmatch workflows; not yet wired to the UI.
 *
 * @param {string} matchId
 * @returns {Promise<{ success: boolean, cleared: number }>}
 */
async function unmatch(matchId) {
  if (!matchId) return { success: false, cleared: 0 };
  const cleared = await repo.clearMatch(matchId);
  return { success: cleared > 0, cleared };
}

function fail(message) {
  return { success: false, message };
}

// ======================================
// LEGACY: AUTO BATCH MATCHING (not exposed in the recon workstation)
// Preserved verbatim in behaviour for backward compatibility.
// ======================================

async function runMatching() {
  console.log("[MatchingEngine] Starting reconciliation matching run...");

  const result = {
    matchesCreated: 0,
    ledgerItemsProcessed: 0,
    statementItemsProcessed: 0,
    errors: []
  };

  try {
    const config = await ReconciliationConfig.findOne({ active: true }).lean();
    const enabledFields = config?.enabledFields || ["itemRef1", "amount", "currency", "valueDate"];

    const [ledgerItems, statementItems] = await Promise.all([
      repo.findOutstandingBySource(RECON_SOURCE.LEDGER),
      repo.findOutstandingBySource(RECON_SOURCE.STATEMENT)
    ]);

    result.ledgerItemsProcessed = ledgerItems.length;
    result.statementItemsProcessed = statementItems.length;

    if (ledgerItems.length === 0 || statementItems.length === 0) {
      return result;
    }

    const matchedStatementIds = new Set();

    for (const ledgerItem of ledgerItems) {
      const matchingStatement = findMatch(ledgerItem, statementItems, enabledFields, matchedStatementIds);
      if (matchingStatement) {
        try {
          const matchId = await reconService.generateMatchId();
          await repo.applyMatch(ledgerItem._id, matchingStatement._id, matchId);
          matchedStatementIds.add(matchingStatement._id.toString());
          result.matchesCreated++;
        } catch (err) {
          result.errors.push(`Failed to match ${ledgerItem.itemId}: ${err.message}`);
        }
      }
    }

    console.log(`[MatchingEngine] Completed. Created ${result.matchesCreated} matches.`);
    return result;
  } catch (err) {
    console.error("[MatchingEngine] Fatal error:", err.message);
    result.errors.push(err.message);
    return result;
  }
}

// ── Legacy field-comparison helpers (used by runMatching) ──

function findMatch(ledgerItem, statementItems, enabledFields, matchedStatementIds) {
  for (const statementItem of statementItems) {
    if (matchedStatementIds.has(statementItem._id.toString())) continue;
    const allMatch = enabledFields.every(field =>
      compareField(ledgerItem[field], statementItem[field], field)
    );
    if (allMatch) return statementItem;
  }
  return null;
}

function compareField(val1, val2, fieldName) {
  const v1 = normalizeValue(val1);
  const v2 = normalizeValue(val2);
  if (v1 === "" && v2 === "") return true;

  if (fieldName === "tradeDate" || fieldName === "valueDate") {
    return compareDates(val1, val2);
  }
  if (fieldName === "amount") {
    const n1 = parseFloat(v1);
    const n2 = parseFloat(v2);
    if (isNaN(n1) && isNaN(n2)) return true;
    if (isNaN(n1) || isNaN(n2)) return false;
    return Math.abs(n1 - n2) < 0.01;
  }
  return v1.toLowerCase() === v2.toLowerCase();
}

function compareDates(d1, d2) {
  if (!d1 && !d2) return true;
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
  return date1.toISOString().split("T")[0] === date2.toISOString().split("T")[0];
}

function normalizeValue(val) {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val).trim();
}

module.exports = {
  // primary (user-driven)
  manualMatch,
  unmatch,
  // legacy (auto batch)
  runMatching,
  findMatch,
  compareField
};
