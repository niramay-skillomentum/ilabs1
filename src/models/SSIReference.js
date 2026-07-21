// ======================================
// SSI REFERENCE MODEL (IMMUTABLE)
// Stores Standard Settlement Instructions imported from Excel.
// These documents must NEVER be modified after import.
// Settlement breaks are created by comparing two different
// valid SSI records, not by mutating fields.
// ======================================

const mongoose = require("mongoose");

const SSIReferenceSchema = new mongoose.Schema({

  // Original row identifier from Excel
  sourceId: { type: String, required: true },

  // Generated unique SSI ID for display (format: SSI-{GroupAbbrev}-{CCY}-{hash})
  ssiId: { type: String, index: true },

  // Counterparty ID (e.g. CPG0050)
  cptyId: { type: String, index: true },

  // Counterparty identification
  groupCounterPartyName: { type: String, required: true, index: true },
  counterPartyName: { type: String, required: true },
  counterpartyType: { type: String },
  typeCode: { type: String },
  registeredCountry: { type: String },

  // Alert matching (used by SSI Database page for dual-code search)
  ssiOnAlert: { type: String },
  alertAcronym: { type: String, index: true },
  alertCode: { type: String, index: true },

  // Settlement instruction details
  currency: { type: String, required: true, index: true },
  defaultSwift: { type: String },

  // Beneficiary (Account With Institution)
  accountWithInstitution: { type: String },
  swiftBicCode: { type: String },
  abaRoutingNumber: { type: String },
  country: { type: String },
  accountNumber: { type: String },

  // Additional instruction fields
  field72: { type: String },
  swift71A: { type: String },
  finalBeneficiary: { type: String },

  // Reference columns A, B, C from Excel
  refA: { type: mongoose.Schema.Types.Mixed },
  refB: { type: mongoose.Schema.Types.Mixed },
  refC: { type: mongoose.Schema.Types.Mixed },

  // Agent/Intermediary Bank (if present → CORRESPONDENT settlement)
  agentBank: { type: String },
  agentSwiftCode: { type: String },
  accountAtAgent: { type: String },

  // Derived settlement type (DIRECT or CORRESPONDENT)
  settlementType: { type: String, enum: ["DIRECT", "CORRESPONDENT"] },

  // Record status
  active: { type: Boolean, default: true },

  // Import traceability
  importBatch: { type: String, required: true },
  importedAt: { type: Date, default: Date.now }

}, {
  timestamps: true,
  // Prevent accidental writes — application-level immutability
  strict: true
});

// Compound index for the primary lookup pattern:
// "Find all active SSI records for counterparty + currency"
SSIReferenceSchema.index(
  { groupCounterPartyName: 1, currency: 1, active: 1 },
  { name: "ssi_lookup_idx" }
);

// Dual-code search index (Alert Code + Acronym Code)
SSIReferenceSchema.index(
  { alertCode: 1, alertAcronym: 1 },
  { name: "ssi_alert_search_idx" }
);

// Source ID index for deduplication during re-import
SSIReferenceSchema.index(
  { sourceId: 1, importBatch: 1 },
  { name: "ssi_source_dedup_idx" }
);

module.exports = mongoose.model("SSIReference", SSIReferenceSchema);
