// ======================================
// RECONCILIATION ITEM MODEL
// Stores all reconciliation items — both Ledger (from Trade Objects)
// and Statement (from SWIFT Messages). Each document represents
// ONE source item. Ledger and Statement items are NEVER merged.
//
// ItemId format: REC000001, REC000002, ...
// MatchId format: MATCH000001, MATCH000002, ...
//
// Status: "Outstanding" (default) | "Matched"
// Source: "LEDGER" | "STATEMENT"
// ======================================

const mongoose = require("mongoose");

const ReconciliationItemSchema = new mongoose.Schema({

  // Unique reconciliation item ID (REC000001, REC000002, ...)
  itemId: { type: String, required: true, unique: true, index: true },

  // Status: Outstanding (default) or Matched
  status: {
    type: String,
    required: true,
    enum: ["Outstanding", "Matched"],
    default: "Outstanding",
    index: true
  },

  // Source system
  source: {
    type: String,
    required: true,
    enum: ["LEDGER", "STATEMENT"],
    index: true
  },

  // Derived item type (auto-calculated, never user-entered)
  itemType: {
    type: String,
    enum: ["LC", "LD", "SC", "SD"]
  },

  // Trade economics
  amount: { type: Number },
  currency: { type: String, index: true },
  tradeDate: { type: Date },
  valueDate: { type: Date },

  // Reconciliation desk assignment (derived from FO Region)
  reconDesk: { type: String, index: true },

  // Match ID — null until matched, then MATCH000001, MATCH000002, ...
  matchId: { type: String, default: null, index: true },

  // Assigned user for My Allocations
  assignedTo: { type: String, default: null, index: true },

  // ======================================
  // ITEM REFERENCES (Trade-level data)
  // Populated for BOTH Ledger and Statement items
  // ======================================
  itemRef1: { type: String, default: null },  // Trade ID (tradeRef)
  itemRef2: { type: String, default: null },  // Underlyer
  itemRef3: { type: String, default: null },  // Entity Code
  itemRef4: { type: String, default: null },  // Country
  itemRef5: { type: String, default: null },  // Product
  itemRef6: { type: String, default: null },  // Product Type
  itemRef7: { type: String, default: null },  // Counterparty

  // ======================================
  // SWIFT REFERENCES (Statement-level data)
  // Populated ONLY for STATEMENT items
  // Must remain NULL for LEDGER items
  // ======================================
  ref1: { type: String, default: null },  // Buyer BIC
  ref2: { type: String, default: null },  // Seller Account
  ref3: { type: String, default: null },  // Buyer Account
  ref4: { type: String, default: null },  // Seller BIC
  ref5: { type: String, default: null },  // Field20 (Transaction Reference)
  ref6: { type: String, default: null },  // 56A (Intermediary)
  ref7: { type: String, default: null },  // Institution Name
  ref8: { type: String, default: null }   // Bank Name

}, { timestamps: true });

// Compound indexes for common query patterns
ReconciliationItemSchema.index(
  { status: 1, source: 1 },
  { name: "recon_status_source_idx" }
);

ReconciliationItemSchema.index(
  { status: 1, reconDesk: 1 },
  { name: "recon_status_desk_idx" }
);

ReconciliationItemSchema.index(
  { itemRef1: 1 },
  { name: "recon_traderef_idx" }
);

module.exports = mongoose.model("ReconciliationItem", ReconciliationItemSchema);
