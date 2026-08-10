// ======================================
// RECONCILIATION VALIDATION SERVICE
// Owns the HIDDEN logic that decides whether a user-selected
// (Ledger, Statement) pair is a genuine match.
//
// The workstation NEVER learns WHY a pair matched or failed — it
// only ever receives a boolean outcome. All comparison rules live
// here so that:
//   - the UI stays a dumb selector,
//   - the rules can evolve (tolerances, profiles, fuzzy matching)
//     without leaking into the presentation layer,
//   - the "investigation" training value is preserved (the learner
//     must reason about the economics, not read a hint).
//
// The internal business identifier that ties a Ledger row to its
// Statement row is intentionally cross-sourced and never displayed
// as a relationship:
//   - LEDGER    carries the trade reference in itemRef1 (trade-sourced)
//   - STATEMENT carries the trade reference in ref5 = SWIFT Field 20
//               (SWIFT-sourced, genuinely present in the message)
// A correct match therefore requires itemRef1 (ledger) === ref5 (statement),
// reinforced by economic agreement (amount, currency, value date).
// ======================================

const { RECON_SOURCE, RECON_STATUS } = require("./reconciliationConstants");

// Penny tolerance for amount comparison.
const AMOUNT_TOLERANCE = 0.01;

/**
 * Validate a candidate match between two already-loaded items.
 * Returns ONLY a boolean verdict plus an internal (non-exposed) reason
 * that callers may log but must never surface to the user.
 *
 * @param {Object} ledgerItem    - LEDGER reconciliation item (lean)
 * @param {Object} statementItem - STATEMENT reconciliation item (lean)
 * @returns {{ valid: boolean, reason: string }}
 */
function validatePair(ledgerItem, statementItem) {
  // ── Structural guards ──
  if (!ledgerItem || !statementItem) {
    return deny("Missing item for matching.");
  }

  if (ledgerItem.itemId === statementItem.itemId) {
    return deny("Cannot match an item with itself.");
  }

  // Exactly one LEDGER and one STATEMENT (order-independent).
  const sources = [ledgerItem.source, statementItem.source].sort().join("|");
  if (sources !== [RECON_SOURCE.LEDGER, RECON_SOURCE.STATEMENT].sort().join("|")) {
    return deny("Match must be between one Ledger and one Statement item.");
  }

  // Normalise which is which regardless of the order they were passed in.
  const ledger = ledgerItem.source === RECON_SOURCE.LEDGER ? ledgerItem : statementItem;
  const statement = ledgerItem.source === RECON_SOURCE.STATEMENT ? ledgerItem : statementItem;

  // Both must still be Outstanding.
  if (ledger.status !== RECON_STATUS.OUTSTANDING || statement.status !== RECON_STATUS.OUTSTANDING) {
    return deny("Recon Status mismatch: Both items must be Outstanding.");
  }

  // ── Hidden business-identifier check ──
  // Ledger.itemRef1 (tradeRef) must equal Statement's Trade ID (itemRef1 if applied manually, else ref5).
  const ledgerRef = normStr(ledger.itemRef1);
  const statementRef = normStr(statement.itemRef1) || normStr(statement.ref5);
  if (!ledgerRef || !statementRef || ledgerRef !== statementRef) {
    return deny(`Trade ID mismatch: Ledger (${ledgerRef || "none"}) vs Statement (${statementRef || "none"}).`);
  }

  // ── Economic agreement ──
  if (!amountsMatch(ledger.amount, statement.amount)) {
    return deny(`Amount mismatch: Ledger (${ledger.amount}) vs Statement (${statement.amount}).`);
  }
  if (normStr(ledger.currency).toUpperCase() !== normStr(statement.currency).toUpperCase()) {
    return deny(`Currency mismatch: Ledger (${ledger.currency}) vs Statement (${statement.currency}).`);
  }

  return { valid: true, reason: "Match successful." };
}

// ======================================
// COMPARISON PRIMITIVES
// ======================================

function amountsMatch(a, b) {
  const n1 = Number(a);
  const n2 = Number(b);
  if (Number.isNaN(n1) || Number.isNaN(n2)) return false;
  return Math.abs(n1 - n2) < AMOUNT_TOLERANCE;
}

function datesMatch(d1, d2) {
  if (!d1 && !d2) return true;
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a.toISOString().split("T")[0] === b.toISOString().split("T")[0];
}

function normStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function deny(reason) {
  return { valid: false, reason };
}

module.exports = {
  validatePair
};
