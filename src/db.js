// ======================================
// DATABASE CONNECTION MODULE
// Connects to MongoDB Atlas via Mongoose
// ======================================

const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("⚠️ MONGO_URI not found in .env — running in memory-only mode");
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 5
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.warn("⚠️ MongoDB connection failed:", err.message);
    console.warn("⚠️ Running in memory-only mode (data will not persist)");
    isConnected = false;
  }
}

function getIsConnected() {
  return isConnected;
}

module.exports = { connectDB, getIsConnected };
