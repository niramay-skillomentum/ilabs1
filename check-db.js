const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/ilabs', { useNewUrlParser: true, useUnifiedTopology: true });
  const Security = mongoose.connection.collection('securities');
  const Entity = mongoose.connection.collection('entities');

  const secs = await Security.find({}).limit(5).toArray();
  console.log('Securities:', JSON.stringify(secs, null, 2));

  const ents = await Entity.find({}).limit(5).toArray();
  console.log('Entities:', JSON.stringify(ents, null, 2));

  process.exit(0);
}

check().catch(console.error);
