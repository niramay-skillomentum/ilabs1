require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const cursor = db.collection('conversations').find({ desk: { $exists: false } });
  
  let count = 0;
  for await (const doc of cursor) {
    let desk = "GENERAL";
    if (doc.desks && doc.desks.length > 0) {
      // Pick the first desk it was associated with
      desk = doc.desks[0];
    }
    await db.collection('conversations').updateOne({ _id: doc._id }, { $set: { desk } });
    count++;
  }
  console.log(`Migrated ${count} old conversations.`);
  process.exit(0);
}
migrate();
