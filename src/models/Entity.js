// ======================================
// ENTITY MODEL (REFERENCE DATA)
// Stores entity master data imported from Entity data.xlsx.
// Entities represent the internal bank entities (e.g., SBG London, SBG New York).
// Used in the trade generation flow to select entity, region, and currency.
//
// Excel structure:
//   Entity Code (currency) | Entity Name | Entity Code (short code) | Address
// ======================================

const mongoose = require("mongoose");

const EntitySchema = new mongoose.Schema({

  entityName: { type: String, required: true, index: true },
  entityCode: { type: String, required: true },
  currency: { type: String, required: true, index: true },
  address: { type: String },

  // Derived region based on entity location
  region: { type: String, index: true },

  // Import traceability
  importBatch: { type: String, required: true },
  importedAt: { type: Date, default: Date.now }

}, { timestamps: true });

// Unique constraint: one entity per currency per entity code
EntitySchema.index({ entityCode: 1, currency: 1 }, { name: "entity_code_ccy_idx", unique: true });

module.exports = mongoose.model("Entity", EntitySchema);
