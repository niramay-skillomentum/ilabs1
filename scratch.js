require('dotenv').config();
const mongoose = require('mongoose');
const Trade = require('./src/models/Trade');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const count = await Trade.countDocuments();
  console.log('Total trades in DB:', count);
  const trades = await Trade.find({}).lean();
  console.log(trades.map(t => ({ ref: t.tradeRef, assignedTo: t.assignedTo, desk: t.nextDesk })));
  process.exit(0);
}).catch(console.error);
