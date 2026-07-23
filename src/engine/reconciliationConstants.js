// ======================================
// RECONCILIATION CONSTANTS & ENUMS
// Single source of truth for every literal used across the
// Reconciliation subsystem (sources, statuses, item types,
// desk names, allocation targets, and the SWIFT field tags
// the StatementCreationService reads from).
//
// Centralising these values here keeps the reconciliation
// services free of magic strings and lets future profiles
// (securities, nostro, FX) extend the vocabulary in one place.
// ======================================

// Source system for a reconciliation item.
// Both LEDGER and STATEMENT rows live in the SAME collection and
// are differentiated ONLY by this field.
const RECON_SOURCE = Object.freeze({
  LEDGER: "LEDGER",
  STATEMENT: "STATEMENT"
});

// Lifecycle status. Every item is born Outstanding and only ever
// transitions to Matched through user-driven matching.
const RECON_STATUS = Object.freeze({
  OUTSTANDING: "Outstanding",
  MATCHED: "Matched"
});

// Derived item type (never user-entered). Derived from source + direction.
const RECON_ITEM_TYPE = Object.freeze({
  LEDGER_CREDIT: "LC",
  LEDGER_DEBIT: "LD",
  STATEMENT_CREDIT: "SC",
  STATEMENT_DEBIT: "SD"
});

// Reconciliation desk assignment.
const RECON_DESK = Object.freeze({
  APAC: "APAC.Cash",
  EMEA: "EMEA.Cash",
  AMER: "AMER.Cash",
  GLOBAL: "GLOBAL.Cash"
});

// FO Region → Recon Desk. Used by the LedgerCreationService (region is a
// trade-level attribute and therefore legitimately available to the ledger).
const REGION_TO_DESK = Object.freeze({
  APAC: RECON_DESK.APAC,
  EMEA: RECON_DESK.EMEA,
  AMER: RECON_DESK.AMER
});

// Allocation targets for the Reconciliation Desk workstation.
// 20 settled trades → 1 Ledger + 1 Statement each → 40 reconciliation rows.
const ALLOCATION = Object.freeze({
  TARGET_TRADES: 20,
  ROWS_PER_TRADE: 2,
  TOTAL_ROWS: 40
});

// Trade lifecycle status that qualifies a trade for reconciliation allocation.
const SETTLED_STATUS = "SETTLED";

// ID prefixes and zero-padding width for generated identifiers.
const ID_FORMAT = Object.freeze({
  ITEM_PREFIX: "REC",
  MATCH_PREFIX: "MATCH",
  PAD_WIDTH: 6
});

// Counter document keys (used by the atomic ID generator).
const COUNTER_KEYS = Object.freeze({
  ITEM: "reconciliation_item",
  MATCH: "reconciliation_match"
});

// ======================================
// SWIFT FIELD TAGS
// The StatementCreationService is allowed to read ONLY values that
// genuinely exist inside a generated SWIFT message. These are the
// stored fieldMap tags (note: stored WITHOUT surrounding colons,
// e.g. "20", "59", "56A" — each value is { value, description }).
// ======================================
const SWIFT_TAG = Object.freeze({
  TRANSACTION_REF: "20",   // Field 20 — Transaction Reference (carries tradeRef)
  RELATED_REF: "21",       // Field 21 — Related Reference (MT202/COV)
  ORDERING_CUSTOMER: "50K", // Field 50K — Ordering Customer (account/name)
  ORDERING_INSTITUTION: "52A", // Field 52A — Ordering Institution BIC
  INTERMEDIARY: "56A",     // Field 56A — Intermediary Institution BIC
  ACCOUNT_WITH_INST: "57A", // Field 57A — Account With Institution BIC
  BENEFICIARY_CUSTOMER: "59", // Field 59 — Beneficiary Customer (account/name)
  BENEFICIARY_INSTITUTION: "58A" // Field 58A — Beneficiary Institution BIC (MT202)
});

// Payment direction as stored on the SWIFT message (paymentDirection).
const SWIFT_DIRECTION = Object.freeze({
  PAY: "PAY",
  RECEIVE: "RECEIVE"
});

module.exports = {
  RECON_SOURCE,
  RECON_STATUS,
  RECON_ITEM_TYPE,
  RECON_DESK,
  REGION_TO_DESK,
  ALLOCATION,
  SETTLED_STATUS,
  ID_FORMAT,
  COUNTER_KEYS,
  SWIFT_TAG,
  SWIFT_DIRECTION
};
