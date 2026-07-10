require("dotenv").config();
const { connectDB } = require("../src/db");
const SSI = require("../src/models/SSIReference");

async function main() {
  await connectDB();
  const pipeline = [
    { 
      $group: { 
        _id: { 
          id: '$cptyId', 
          ccy: '$currency', 
          bank: { $ifNull: ['$accountWithInstitution', '$finalBeneficiary'] } 
        }, 
        count: { $sum: 1 } 
      } 
    }, 
    { $match: { count: { $gt: 1 } } } 
  ]; 
  const result = await SSI.aggregate(pipeline); 
  console.log('Groups with >1 SSI (Same ID, CCY, AND Bank):', result.length); 
  
  const totalGroups = await SSI.aggregate([
    { $group: { _id: { id: '$cptyId', ccy: '$currency' }, count: { $sum: 1 } } }, 
    { $match: { count: { $gt: 1 } } }
  ]); 
  console.log('Groups with >1 SSI (Same ID, CCY):', totalGroups.length);
  process.exit(0);
}
main();
