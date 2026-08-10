require('dotenv').config();
const mongoose = require('mongoose');

async function drop() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await mongoose.connection.collection('conversations').dropIndex('tradeRef_1');
    console.log('Dropped tradeRef_1 index');
  } catch(e) {
    console.log('Index might not exist or error:', e.message);
  }
  process.exit(0);
}
drop();
