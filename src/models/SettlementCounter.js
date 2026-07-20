// ======================================
// SETTLEMENT COUNTER MODEL
// Atomic counter for generating sequential references:
//   - Settlement Reference: "260001", "260002" (YY + 4-digit seq)
//   - SSI Reference: "SGB-EUR-001", "SGB-USD-001" (per-currency seq)
//
// Uses MongoDB findOneAndUpdate with $inc for race-safe
// atomic increment — prevents duplicate references even
// under concurrent settlement operations.
// ======================================

const mongoose = require("mongoose");

const SettlementCounterSchema = new mongoose.Schema({

  // Unique key: "SETTLEMENT_REF" or "SSI_REF_EUR", "SSI_REF_USD", etc.
  key: { type: String, required: true, unique: true, index: true },

  // Year component (e.g. 26 for 2026)
  year: { type: Number, required: true },

  // Current sequence number (auto-incremented)
  sequence: { type: Number, required: true, default: 0 }

}, { timestamps: true });

/**
 * Atomically increment and return the next sequence number.
 * If the document doesn't exist, creates it with sequence = 1.
 * If the year has changed, resets the sequence to 1.
 *
 * @param {string} key - Counter key (e.g. "SETTLEMENT_REF")
 * @param {number} currentYear - 2-digit year (e.g. 26)
 * @returns {Promise<{year: number, sequence: number}>}
 */
SettlementCounterSchema.statics.getNext = async function (key, currentYear) {
  // Check if year rolled over — if so, reset sequence
  const existing = await this.findOne({ key });
  if (existing && existing.year !== currentYear) {
    existing.year = currentYear;
    existing.sequence = 0;
    await existing.save();
  }

  const result = await this.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 }, $setOnInsert: { year: currentYear } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { year: result.year, sequence: result.sequence };
};

module.exports = mongoose.model("SettlementCounter", SettlementCounterSchema);
