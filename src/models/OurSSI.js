// ======================================
// OUR SSI MODEL (REFERENCE DATA)
// Stores the bank's own Standard Settlement Instructions
// imported from Our_SSI.xlsx. Each row maps an entity + currency
// to our bank's BIC, account number, and address.
//
// Used in SWIFT message generation to populate the "our side"
// fields (sender for BUY, beneficiary for SELL).
// ======================================

const mongoose = require("mongoose");

const OurSSISchema = new mongoose.Schema({

  currency: { type: String, required: true, index: true },
  entityName: { type: String, required: true, index: true },
  entityCode: { type: String, required: true, index: true },
  address: { type: String },
  bicSwiftCode: { type: String, required: true },
  accountName: { type: String },
  accountNumber: { type: String },
  field72: { type: String },

  // Import traceability
  importBatch: { type: String, required: true },
  importedAt: { type: Date, default: Date.now }

}, { timestamps: true });

// Unique constraint: one SSI per entity per currency
OurSSISchema.index(
  { entityCode: 1, currency: 1 },
  { name: "our_ssi_entity_ccy_idx", unique: true }
);

module.exports = mongoose.model("OurSSI", OurSSISchema);
