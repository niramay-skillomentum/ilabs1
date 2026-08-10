const mongoose = require("mongoose");

const foMessageSchema = new mongoose.Schema({
  sender: String,
  senderRole: { type: String, enum: ["USER", "FO"] },
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const foCommunicationSchema = new mongoose.Schema({
  tradeRef: { type: String, required: true, unique: true },
  desk: { type: String, required: true },
  openedBy: String,
  openedAt: { type: Date, default: Date.now },
  status: { type: String, default: "OPEN" },
  messages: [foMessageSchema]
}, { timestamps: true });

module.exports = mongoose.model("FOCommunication", foCommunicationSchema);
