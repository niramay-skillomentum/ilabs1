const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { CPTY_SSIS, ENTITY_SSIS } = require("../engine/tradeGenerator");

router.get("/search", authenticateToken, (req, res) => {
  const ssiId = req.query.id;
  if (!ssiId) {
    return res.status(400).json({ success: false, error: "SSI ID is required" });
  }

  // Search through both CPTY and ENTITY SSIs
  const allDicts = [CPTY_SSIS, ENTITY_SSIS];
  
  for (const dict of allDicts) {
    for (const key in dict) {
      const ssiList = dict[key];
      const found = ssiList.find(ssi => ssi.ssiId === ssiId);
      if (found) {
        return res.json({ success: true, ssi: found });
      }
    }
  }

  return res.status(404).json({ success: false, error: "SSI not found in database" });
});

module.exports = router;
