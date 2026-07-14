// ======================================
// SECURITY MODEL (REFERENCE DATA)
// Stores security master data imported from Security Data.xlsx.
// Security Data has 3 sheets: EQ FI, FX, Derivative.
// Used in the flow: Product → Product Type → Security → Underlyer/Currency → SSI lookup.
// ======================================

const mongoose = require("mongoose");

const SecuritySchema = new mongoose.Schema({

  companyName: { type: String },
  isin: { type: String, index: true },
  currency: { type: String, required: true, index: true },
  issuingCountry: { type: String },
  securityDescription: { type: String },

  // Underlyer (e.g., "FX AUD/SEK" for FX, ISIN for Derivatives, company name for Equity)
  underlyer: { type: String, required: true },

  // Product taxonomy from Excel
  product: { type: String, required: true, index: true },         // Derivative, FX, Equity, Fixed Income
  productType: { type: String, required: true, index: true },     // Forward, FX Spot, Equity, Corporate Bond, etc.
  tradeType: { type: String, required: true },                    // OTC, Exchange, Listed

  // Which Excel sheet this was imported from
  sheetName: { type: String, required: true },

  // Import traceability
  importBatch: { type: String, required: true },
  importedAt: { type: Date, default: Date.now }

}, { timestamps: true });

// Lookup by product (for trade generation: pick securities for a given product)
SecuritySchema.index({ product: 1, productType: 1 }, { name: "security_product_idx" });

// Lookup by currency (for SSI chain)
SecuritySchema.index({ currency: 1 }, { name: "security_currency_idx" });

module.exports = mongoose.model("Security", SecuritySchema);
