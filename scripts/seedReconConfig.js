// ======================================
// SEED RECONCILIATION CONFIG
// Seeds the default matching configuration for the
// Enterprise Reconciliation Desk.
//
// Usage: node scripts/seedReconConfig.js
// ======================================

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/db");
const ReconciliationConfig = require("../src/models/ReconciliationConfig");

async function seed() {
  await connectDB();

  const existing = await ReconciliationConfig.findOne({ matchingProfile: "Cash Settlement" });

  if (existing) {
    console.log("✅ Cash Settlement matching profile already exists. Skipping.");
    await mongoose.disconnect();
    return;
  }

  const config = await ReconciliationConfig.create({
    matchingProfile: "Cash Settlement",
    description: "Default matching profile for cash settlement reconciliation. Matches ledger items against SWIFT statement items using trade-level and SWIFT-level references.",
    enabledFields: [
      "itemRef1",   // Trade ID
      "amount",     // Trade amount
      "currency",   // Currency
      "valueDate",  // Value Date
      "itemRef3",   // Entity Code
      "itemRef5",   // Product
      "itemRef6",   // Product Type
      "itemRef2"    // Underlyer
    ],
    autoMatchThreshold: 100,
    active: true
  });

  console.log("✅ Created Cash Settlement matching profile:");
  console.log(`   ID: ${config._id}`);
  console.log(`   Profile: ${config.matchingProfile}`);
  console.log(`   Enabled Fields: ${config.enabledFields.join(", ")}`);
  console.log(`   Threshold: ${config.autoMatchThreshold}%`);

  await mongoose.disconnect();
  console.log("✅ Done.");
}

seed().catch(err => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
