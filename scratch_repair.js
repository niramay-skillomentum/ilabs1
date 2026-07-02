const mongoose = require('mongoose');
require('dotenv').config();
const Trade = require('./src/models/Trade');
const { templates } = require('./src/engine/settlementScenarioManager');
const uri = process.env.MONGO_URI || "mongodb://localhost:27017/ilabs1";

async function repair() {
  await mongoose.connect(uri);
  const allTrades = await Trade.find({});
  console.log(`Found ${allTrades.length} total trades in DB`);
  const settlementTrades = await Trade.find({ currentStatus: { $in: ['SETTLEMENT_PENDING', 'READY_FOR_APPROVAL', 'SETTLEMENT_BREAK', 'SETTLED'] }});
  console.log(`Found ${settlementTrades.length} settlement trades`);
  
  if (settlementTrades.length > 0) {
    console.log("First settlement trade:", settlementTrades[0].settlementScenario);
  }
  process.exit(0);
}

repair();
