const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },

  // ── Profile fields for internal contact cards ──
  designation: { type: String, default: "Financial Analyst" },
  department: { type: String, default: "Post Trade Operations" },
  reportingManager: { type: String, default: "John Doe (VP)" },
  officeLocation: { type: String, default: "Mumbai Office" },
  extension: { type: String, default: "4521" },
  avatar: { type: String, default: null },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
