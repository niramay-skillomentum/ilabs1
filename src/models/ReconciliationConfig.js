// ======================================
// RECONCILIATION CONFIG MODEL
// Stores configurable matching profiles that drive the
// ReconciliationEngine's matching logic.
//
// This mirrors enterprise reconciliation products
// (SmartStream TLM, Duco, IntelliMatch, Gresham Clareti)
// where matching rules are configurable rather than
// embedded in code.
//
// Allows future reconciliation scenarios (cash, securities,
// nostro, fees, FX, derivatives) without modifying the engine.
// ======================================

const mongoose = require("mongoose");

const ReconciliationConfigSchema = new mongoose.Schema({

  // Profile name (e.g. "Cash Settlement", "Securities", "Nostro")
  matchingProfile: { type: String, required: true, unique: true },

  // Fields that participate in matching
  // Values must correspond to ReconciliationItem field names
  enabledFields: [{
    type: String,
    enum: [
      "itemRef1",   // Trade ID
      "itemRef2",   // Underlyer
      "itemRef3",   // Entity Code
      "itemRef4",   // Country
      "itemRef5",   // Product
      "itemRef6",   // Product Type
      "amount",
      "currency",
      "tradeDate",
      "valueDate",
      "ref1",       // Buyer BIC
      "ref2",       // Seller Account
      "ref3",       // Buyer Account
      "ref4",       // Seller BIC
      "ref5",       // Field20
      "ref6",       // 56A
      "ref7",       // Institution Name
      "ref8",       // Bank Name
      "ref9",       // Field 72
      "ref10"       // Field 70
    ]
  }],

  // Threshold percentage — 100 means ALL enabled fields must match
  autoMatchThreshold: { type: Number, default: 100 },

  // Whether this profile is currently active
  active: { type: Boolean, default: true },

  // Description for UI display
  description: { type: String, default: "" }

}, { timestamps: true });

module.exports = mongoose.model("ReconciliationConfig", ReconciliationConfigSchema);
