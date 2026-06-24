const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../middleware/auth");

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const emailLower = email.toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const newUser = new User({
      fullName,
      email: emailLower,
      password: hashedPassword
    });
    await newUser.save();

    res.json({ success: true, message: "Registration successful" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailLower = email.toLowerCase();
    const userRecord = await User.findOne({ email: emailLower });

    if (!userRecord) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, userRecord.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Login successful — generate JWT (3 hours to match session)
    const token = jwt.sign(
      { userId: userRecord.email, fullName: userRecord.fullName },
      JWT_SECRET,
      { expiresIn: "3h" }
    );

    // Set cookie with token
    res.setHeader("Set-Cookie", `auth_token=${token}; Path=/; Max-Age=${3 * 60 * 60}; SameSite=Lax`);

    res.json({
      success: true,
      token,
      user: {
        email: userRecord.email,
        fullName: userRecord.fullName
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
