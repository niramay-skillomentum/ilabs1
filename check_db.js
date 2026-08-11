require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const doc = await db.collection('conversations').findOne({ tradeRef: 'TRD-QLDR5E67' });
  console.log("CONVERSATION:", JSON.stringify(doc, null, 2));
  process.exit(0);
}
check();
