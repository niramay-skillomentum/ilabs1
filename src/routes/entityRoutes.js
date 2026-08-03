const express = require("express");
const router = express.Router();
const Entity = require("../models/Entity");

// Search entities
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(q, "i");
    
    // Search by entityName or entityCode or bic
    const entities = await Entity.find({
      $or: [
        { entityName: regex },
        { entityCode: regex },
        { bic: regex }
      ]
    }).limit(20).lean();

    res.json({ success: true, data: entities });
  } catch (error) {
    console.error("Error searching entities:", error);
    res.status(500).json({ success: false, error: "Failed to search entities" });
  }
});

// Get entity by ID or Code
router.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try by mongoose ID first if valid
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      const entityById = await Entity.findById(identifier).lean();
      if (entityById) return res.json({ success: true, data: entityById });
    }

    // Try by entityCode, entityName, or bic exact match
    const entityMatch = await Entity.findOne({
      $or: [
        { entityCode: new RegExp(`^${identifier}$`, "i") },
        { entityName: new RegExp(`^${identifier}$`, "i") },
        { bic: new RegExp(`^${identifier}`, "i") }
      ]
    }).lean();
    if (entityMatch) return res.json({ success: true, data: entityMatch });

    // Fallback: partial match on entityName
    const partialMatch = await Entity.findOne({ entityName: new RegExp(identifier, "i") }).lean();
    if (partialMatch) return res.json({ success: true, data: partialMatch });

    // Not found
    res.status(404).json({ success: false, error: "Entity not found" });

  } catch (error) {
    console.error("Error fetching entity:", error);
    res.status(500).json({ success: false, error: "Failed to fetch entity" });
  }
});

module.exports = router;
