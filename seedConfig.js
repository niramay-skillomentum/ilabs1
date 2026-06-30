require("dotenv").config();
const mongoose = require("mongoose");
const SystemConfig = require("./src/models/SystemConfig");
const { connectDB } = require("./src/db");

async function seed() {
  await connectDB();
  
  await SystemConfig.findOneAndUpdate(
    { key: "SETTLEMENT_INITIAL_STATE" },
    { 
      key: "SETTLEMENT_INITIAL_STATE", 
      value: "SETTLEMENT_PENDING", 
      description: "Default status for newly arrived settlement trades"
    },
    { upsert: true, new: true }
  );

  console.log("Seeded SystemConfig successfully.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
