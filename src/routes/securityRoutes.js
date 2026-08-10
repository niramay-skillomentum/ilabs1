const express = require("express");
const router = express.Router();
const Security = require("../models/Security");

// Search securities
router.get("/search", async (req, res) => {
  try {
    const { q, product } = req.query;
    
    let query = {};
    
    if (q) {
      const regex = new RegExp(q, "i");
      query = {
        $or: [
          { companyName: regex },
          { isin: regex },
          { underlyer: regex },
          { securityDescription: regex }
        ]
      };
    }
    
    if (product) {
      query.product = product;
    }

    if (Object.keys(query).length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Search by companyName, isin, underlyer, or securityDescription
    const securities = await Security.find(query).limit(100).lean();

    res.json({ success: true, data: securities });
  } catch (error) {
    console.error("Error searching securities:", error);
    res.status(500).json({ success: false, error: "Failed to search securities" });
  }
});

const tradeGenerator = require("../engine/tradeGenerator");

// Get product taxonomy
router.get("/products", async (req, res) => {
  try {
    const taxonomy = tradeGenerator.PRODUCT_TAXONOMY;
    const products = [];
    for (const [product, details] of Object.entries(taxonomy)) {
      for (const productType of details.productTypes) {
        products.push({
          product,
          productType,
          tradeType: details.tradeTypeMap[productType]
        });
      }
    }
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

const Entity = require("../models/Entity");

// Get related entities & assets
router.get("/related", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(q, "i");
    
    const [entities, securities] = await Promise.all([
      Entity.find({
        $or: [{ entityName: regex }, { entityCode: regex }]
      }).limit(10).lean(),
      Security.find({
        $or: [{ companyName: regex }, { isin: regex }, { underlyer: regex }]
      }).limit(20).lean()
    ]);

    const related = [];
    
    for (const ent of entities) {
      related.push({
        entity: ent.entityName,
        type: 'Internal Entity',
        relation: ent.region || 'Branch'
      });
    }

    for (const sec of securities) {
      related.push({
        entity: sec.isin || sec.underlyer,
        type: 'Linked Asset',
        relation: sec.productType || sec.product
      });
    }

    res.json({ success: true, data: related });
  } catch (error) {
    console.error("Error fetching related:", error);
    res.status(500).json({ success: false, error: "Failed to fetch related data" });
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

    // Try by companyName exact match
    const secByCompany = await Security.findOne({ companyName: new RegExp(`^${identifier}$`, "i") }).lean();
    if (secByCompany) return res.json({ success: true, data: secByCompany });
    
    // Fallback: partial match on companyName
    const secPartial = await Security.findOne({ companyName: new RegExp(identifier, "i") }).lean();
    if (secPartial) return res.json({ success: true, data: secPartial });

    // Not found
    res.status(404).json({ success: false, error: "Security not found" });

  } catch (error) {
    console.error("Error fetching security:", error);
    res.status(500).json({ success: false, error: "Failed to fetch security" });
  }
});

module.exports = router;
