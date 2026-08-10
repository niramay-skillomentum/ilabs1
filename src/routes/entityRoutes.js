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
    
    // Search by entityName or entityCode or bic or currency in Entity collection
    const entities = await Entity.find({
      $or: [
        { entityName: regex },
        { entityCode: regex },
        { bic: regex },
        { currency: regex }
      ]
    }).limit(20).lean();

    // Search SSI Reference for counterparties and BICs
    const SSIReference = require("../models/SSIReference");
    // Find more to allow for deduplication
    const ssiMatches = await SSIReference.find({
      $or: [
        { groupCounterPartyName: regex },
        { counterPartyName: regex },
        { swiftBicCode: regex },
        { agentSwiftCode: regex }
      ]
    }).limit(100).lean();

    // Deduplicate SSI matches by BIC
    const uniqueSSIs = [];
    const seenBics = new Set();
    
    // Also consider entities we already found
    for (const ent of entities) {
      if (ent.bic) seenBics.add(ent.bic);
    }

    for (const ssi of ssiMatches) {
      if (ssi.swiftBicCode && !seenBics.has(ssi.swiftBicCode)) {
        seenBics.add(ssi.swiftBicCode);
        uniqueSSIs.push({
          bic: ssi.swiftBicCode,
          entityName: ssi.accountWithInstitution || ssi.agentBank || ssi.groupCounterPartyName,
          currency: ssi.currency,
          region: ssi.country || ssi.registeredCountry
        });
      }
      if (ssi.agentSwiftCode && !seenBics.has(ssi.agentSwiftCode)) {
        seenBics.add(ssi.agentSwiftCode);
        uniqueSSIs.push({
          bic: ssi.agentSwiftCode,
          entityName: ssi.agentBank || ssi.accountWithInstitution || ssi.groupCounterPartyName,
          currency: ssi.currency,
          region: ssi.country || ssi.registeredCountry
        });
      }
      if (uniqueSSIs.length >= 20) break;
    }

    // Combine results
    let allResults = [...entities, ...uniqueSSIs];

    // If the query looks like an 8 or 11 character BIC code
    // restrict results to ONLY those matches where the primary BIC matches.
    if (/^[a-zA-Z0-9]{8,11}$/.test(q)) {
      const qUpper = q.toUpperCase();
      allResults = allResults.filter(r => {
        const primaryBic = (r.bic || r.swiftBicCode || "").toUpperCase();
        return primaryBic.startsWith(qUpper);
      });
    }

    res.json({ success: true, data: allResults });
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

    // Try by entityCode, entityName, bic, or currency exact match
    const entityMatch = await Entity.findOne({
      $or: [
        { entityCode: new RegExp(`^${identifier}$`, "i") },
        { entityName: new RegExp(`^${identifier}$`, "i") },
        { bic: new RegExp(`^${identifier}`, "i") },
        { currency: new RegExp(`^${identifier}$`, "i") }
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
