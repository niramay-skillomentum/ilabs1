const express = require("express");
const router = express.Router();
const Security = require("../models/Security");

// Search securities
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(q, "i");
    
    // Search by companyName, isin, underlyer, or securityDescription
    const securities = await Security.find({
      $or: [
        { companyName: regex },
        { isin: regex },
        { underlyer: regex },
        { securityDescription: regex }
      ]
    }).limit(20).lean();

    res.json({ success: true, data: securities });
  } catch (error) {
    console.error("Error searching securities:", error);
    res.status(500).json({ success: false, error: "Failed to search securities" });
  }
});

// Get security by ID, ISIN or underlyer exact match
router.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try by mongoose ID first if valid
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      const secById = await Security.findById(identifier).lean();
      if (secById) return res.json({ success: true, data: secById });
    }

    // Try by ISIN exact match
    const secByIsin = await Security.findOne({ isin: new RegExp(`^${identifier}$`, "i") }).lean();
    if (secByIsin) return res.json({ success: true, data: secByIsin });

    // Try by underlyer exact match
    const secByUnderlyer = await Security.findOne({ underlyer: new RegExp(`^${identifier}$`, "i") }).lean();
    if (secByUnderlyer) return res.json({ success: true, data: secByUnderlyer });

    // Not found
    res.status(404).json({ success: false, error: "Security not found" });

  } catch (error) {
    console.error("Error fetching security:", error);
    res.status(500).json({ success: false, error: "Failed to fetch security" });
  }
});

module.exports = router;
