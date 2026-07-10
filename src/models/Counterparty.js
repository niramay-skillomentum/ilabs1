// ======================================
// COUNTERPARTY MODEL (REFERENCE DATA)
// Stores counterparty master data extracted from SSI reference data.
// Provides the counterparty dimension for the settlement lookup chain:
//   Product → Security → Currency → Counterparty → SSI
// ======================================

const mongoose = require("mongoose");

const CounterpartySchema = new mongoose.Schema({

  counterpartyId: { type: String, required: true, unique: true, index: true },
  counterpartyName: { type: String, required: true },
  group: { type: String },
  country: { type: String },
  type: { type: String },
  typeCode: { type: String },

  // Import traceability
  importBatch: { type: String, required: true },
  importedAt: { type: Date, default: Date.now }

}, { timestamps: true });

module.exports = mongoose.model("Counterparty", CounterpartySchema);
