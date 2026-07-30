// ======================================
// USER PROFILE ROUTES
// API endpoints for contact card hover data.
// Internal users: profile from User model + active Queue.
// External contacts: simulated from Counterparty model.
// ======================================

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Queue = require("../models/Queue");
const Counterparty = require("../models/Counterparty");
const { authenticateToken } = require("../middleware/auth");

// ── Simulated presence from lastActivity ──
function getPresence(lastActivity) {
  if (!lastActivity) return { status: "Offline", dot: "⚫", color: "#605e5c" };
  const diffMs = Date.now() - new Date(lastActivity).getTime();
  const diffMin = diffMs / 60000;
  if (diffMin < 2) return { status: "Available", dot: "🟢", color: "#107c10" };
  if (diffMin < 10) return { status: "Busy", dot: "🟡", color: "#835c00" };
  return { status: "Away", dot: "🔴", color: "#d13438" };
}

// ── Simulated external contact data ──
const EXTERNAL_ROLES = ["Vice President", "Director", "Associate", "Analyst", "Managing Director"];
const EXTERNAL_DEPTS = ["Equities Trading", "Fixed Income", "FX Trading", "Prime Services", "Operations"];
const EXTERNAL_TZ = ["London", "New York", "Tokyo", "Singapore", "Hong Kong", "Frankfurt"];

function generateExternalProfile(counterpartyName) {
  // Deterministic but varied data based on the counterparty name
  const hash = counterpartyName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    name: counterpartyName + " Operations",
    email: `operations@${counterpartyName.toLowerCase().replace(/\s+/g, "")}.com`,
    company: counterpartyName,
    department: EXTERNAL_DEPTS[hash % EXTERNAL_DEPTS.length],
    role: EXTERNAL_ROLES[hash % EXTERNAL_ROLES.length],
    timezone: EXTERNAL_TZ[hash % EXTERNAL_TZ.length],
    preferredCommunication: "Email",
    type: "EXTERNAL"
  };
}

// ======================================
// GET /api/user-profile/:userId
// Internal user contact card
// ======================================
router.get("/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === "FO") {
      return res.json({
        success: true,
        profile: {
          fullName: "Front Office Trading Desk",
          email: "fo.trading@sgb.com",
          designation: "Trading Desk",
          department: "Front Office",
          reportingManager: "N/A",
          officeLocation: "Skillomentum Office",
          extension: "—",
          currentDesk: null,
          lastActive: null,
          presence: { status: "Available", dot: "🟢", color: "#107c10" },
          type: "INTERNAL"
        }
      });
    }

    const user = await User.findOne({ email: userId }).select("-password").lean();

    if (!user) {
      // Return a minimal fallback for users not found in DB
      return res.json({
        success: true,
        profile: {
          fullName: userId,
          email: userId,
          designation: "Operations Analyst",
          department: "Post Trade Operations",
          reportingManager: "N/A",
          officeLocation: "Mumbai Office",
          extension: "—",
          currentDesk: null,
          lastActive: null,
          presence: { status: "Offline", dot: "⚫", color: "#605e5c" },
          type: "INTERNAL"
        }
      });
    }

    // Check active queue for current desk + last activity
    const activeQueue = await Queue.findOne({ userId, isActive: true }).lean();
    const currentDesk = activeQueue ? activeQueue.desk : null;
    const lastActive = activeQueue ? activeQueue.lastActivity : null;
    const presence = getPresence(lastActive);

    // Format "last active" as relative time
    let lastActiveText = null;
    if (lastActive) {
      const diffMin = Math.floor((Date.now() - new Date(lastActive).getTime()) / 60000);
      if (diffMin < 1) lastActiveText = "Just now";
      else if (diffMin < 60) lastActiveText = `${diffMin} min ago`;
      else lastActiveText = `${Math.floor(diffMin / 60)} hr ago`;
    }

    res.json({
      success: true,
      profile: {
        fullName: user.fullName,
        email: user.email,
        designation: user.designation || "Financial Analyst",
        department: user.department || "Post Trade Operations",
        reportingManager: user.reportingManager || "John Doe (VP)",
        officeLocation: user.officeLocation || "Mumbai Office",
        extension: user.extension || "4521",
        currentDesk,
        lastActive: lastActiveText,
        presence,
        type: "INTERNAL"
      }
    });
  } catch (err) {
    console.error("User profile error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// GET /api/user-profile/external/:counterpartyName
// External counterparty contact card
// ======================================
router.get("/external/:counterpartyName", authenticateToken, async (req, res) => {
  try {
    const { counterpartyName } = req.params;

    // Try to find in DB for richer data
    const cpty = await Counterparty.findOne({
      counterpartyName: { $regex: new RegExp(`^${counterpartyName}$`, "i") }
    }).lean();

    const profile = generateExternalProfile(counterpartyName);

    if (cpty) {
      profile.company = cpty.counterpartyName;
      if (cpty.country) profile.timezone = cpty.country;
      if (cpty.type) profile.department = cpty.type;
    }

    // Simulate last interaction as a random recent time
    const hash = counterpartyName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const hoursAgo = (hash % 12) + 1;
    profile.lastInteraction = hoursAgo === 1 ? "1 hour ago" : `${hoursAgo} hours ago`;

    res.json({ success: true, profile });
  } catch (err) {
    console.error("External profile error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
