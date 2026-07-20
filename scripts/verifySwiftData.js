require("dotenv").config();
const { connectDB } = require("../src/db");
const SSI = require("../src/models/SSIReference");
const OurSSI = require("../src/models/OurSSI");

connectDB().then(async () => {
  const withType = await SSI.countDocuments({ counterpartyType: { $exists: true, $ne: null } });
  console.log("SSI with counterpartyType:", withType);
  
  const withSwift = await SSI.countDocuments({ defaultSwift: { $exists: true, $ne: null } });
  console.log("SSI with defaultSwift:", withSwift);
  
  const withAgent = await SSI.countDocuments({ agentBank: { $exists: true, $ne: null } });
  console.log("SSI with agentBank:", withAgent);
  
  const types = await SSI.aggregate([{ $group: { _id: "$counterpartyType", count: { $sum: 1 } } }]);
  console.log("Counterparty types:", JSON.stringify(types));
  
  const swiftTypes = await SSI.aggregate([{ $group: { _id: "$defaultSwift", count: { $sum: 1 } } }]);
  console.log("Default SWIFT:", JSON.stringify(swiftTypes));
  
  const ourCount = await OurSSI.countDocuments();
  const entities = await OurSSI.distinct("entityCode");
  console.log("Our SSI count:", ourCount, "entities:", entities);
  
  const sample = await OurSSI.findOne({ currency: "USD" }).lean();
  console.log("Our SSI USD:", sample ? `${sample.entityName} | ${sample.bicSwiftCode} | ${sample.accountNumber}` : "NOT FOUND");
  
  process.exit(0);
});
