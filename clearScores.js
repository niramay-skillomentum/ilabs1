require('dotenv').config();
const mongoose = require("mongoose");
const SessionScore = require("./src/models/SessionScore");
const { connectDB } = require("./src/db");

async function clearHistory() {
  await connectDB();
  await SessionScore.deleteMany({});
  console.log("SessionScore collection cleared.");
  process.exit(0);
}

clearHistory();
