// ======================================
// SECURITY MODEL (REFERENCE DATA)
// Stores security master data imported from Security Data.xlsx.
// Used in the flow: Product → Security → ISIN/Currency → SSI lookup.
// ======================================

const mongoose = require("mongoose");

const SecuritySchema = new mongoose.Schema({

  companyName: { type: String, required: true },
  isin: { type: String, required: true, unique: true, index: true },
  currency: { type: String, required: true, index: true },
  issuingCountry: { type: String, required: true },

  // Import traceability
  importBatch: { type: String, required: true },
  importedAt: { type: Date, default: Date.now }

}, { timestamps: true });

// Lookup by currency (for trade generation flow)
SecuritySchema.index({ currency: 1 }, { name: "security_currency_idx" });

module.exports = mongoose.model("Security", SecuritySchema);
