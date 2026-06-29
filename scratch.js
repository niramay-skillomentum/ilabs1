require('dotenv').config();
const mongoose = require('mongoose');
const dailyScheduler = require('./src/engine/dailyScheduler');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Running daily scheduler to fix ages...');
  await dailyScheduler.runDailyCycle();
  console.log('Done.');
  process.exit(0);
}).catch(console.error);
