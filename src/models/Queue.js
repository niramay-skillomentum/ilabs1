const mongoose = require("mongoose");

const QueueSchema = new mongoose.Schema({

  userId: { type: String, required: true, unique: true, index: true },
  desk: { type: String, required: true },

  trades: [{ type: String }],   // Array of tradeRef strings

  sessionStart: { type: Date, default: Date.now },
  sessionExpiry: { type: Date },  // sessionStart + 3 hours
  isActive: { type: Boolean, default: true, index: true },

  lastActivity: { type: Date, default: Date.now }

}, { timestamps: true });

// cleanupExpiredSessions runs Queue.find({ isActive: true, sessionExpiry: { $lt: now } }).
// This compound index serves that sweep directly. (The per-user lookup is already
// covered by the unique userId index above.)
QueueSchema.index({ isActive: 1, sessionExpiry: 1 });

module.exports = mongoose.model("Queue", QueueSchema);
