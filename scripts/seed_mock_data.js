const mongoose = require("mongoose");
const Trade = require("../src/models/Trade");
const Entity = require("../src/models/Entity");
require("dotenv").config({ path: "../.env" });
const { connectDB } = require("../src/db");

async function seedMockData() {
  await connectDB();

  // Seed Mock Entities
  const entities = [
    {
      entityCode: "HSBC",
      entityName: "HSBC Bank plc",
      bic: "HSBCGB2L",
      status: "ACTIVE",
      type: "BANK"
    },
    {
      entityCode: "ACC",
      entityName: "ACC Bank",
      bic: "ACCBXX2L",
      status: "ACTIVE",
      type: "BANK"
    }
  ];

  for (const ent of entities) {
    await Entity.findOneAndUpdate(
      { entityCode: ent.entityCode },
      ent,
      { upsert: true, new: true }
    );
  }
  console.log("Mock Entities Seeded");

  // Seed Mock Trades
  const trades = [
    {
      tradeRef: "TRD001",
      currentStatus: "MO_PENDING",
      nextDesk: "MO",
      amount: 1500000.0,
      currency: "USD",
      counterparty: "JPMorgan Chase",
      direction: "BUY",
      entity: "HSBC",
      foRegion: "EMEA",
      product: "FX",
      tradeType: "SPOT",
      settlementType: "DVP",
      underlyer: "EUR/USD",
      tradeDate: new Date(),
      valueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    },
    {
      tradeRef: "TRD0001256",
      currentStatus: "MO_PENDING",
      nextDesk: "MO",
      amount: 500000.0,
      currency: "EUR",
      counterparty: "Goldman Sachs",
      direction: "SELL",
      entity: "ACC",
      foRegion: "EMEA",
      product: "EQUITY",
      tradeType: "CASH",
      settlementType: "DVP",
      underlyer: "Apple Inc.",
      tradeDate: new Date(),
      valueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    }
  ];

  for (const t of trades) {
    await Trade.findOneAndUpdate(
      { tradeRef: t.tradeRef },
      t,
      { upsert: true, new: true }
    );
  }
  console.log("Mock Trades Seeded");

  process.exit(0);
}

seedMockData().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
