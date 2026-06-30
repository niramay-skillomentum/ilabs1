const mongoose = require("mongoose");

const SystemConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("SystemConfig", SystemConfigSchema);
