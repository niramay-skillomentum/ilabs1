require("dotenv").config();
const { connectDB } = require("./src/db");
const reconService = require("./src/engine/reconciliationService");
async function run() {
  await connectDB();
  console.log("Running Sync...");
  const res = await reconService.syncLedgerAndStatements();
  console.log("Sync Complete:", res);
  process.exit(0);
}
run();
