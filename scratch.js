require('dotenv').config();
const mongoose = require('mongoose');
const Trade = require('./src/models/Trade');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await Trade.updateMany(
    { currentStatus: 'LIASING_WITH_CPTY', cptyContactCount: 0 },
    { cptyContactCount: 1 }
  );
  console.log('Trade updated successfully.', result);
  process.exit(0);
}).catch(console.error);
