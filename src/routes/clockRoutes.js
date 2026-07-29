const express = require("express");
const router = express.Router();
const simulationClock = require("../engine/clock");
const cutoffEngine = require("../engine/cutoff");

// ======================================
// CLOCK API
// ======================================
router.get("/", (req, res) => {
  const now = simulationClock.getTime();

  const hours = now.getHours();
  const minutes = now.getMinutes();

  const totalMinutesLeft = (18 * 60) - (hours * 60 + minutes);

  // Include cut-off statuses for all currencies
  const cutoffs = cutoffEngine.getAllCutoffStatuses();

  res.json({
    simTime: simulationClock.getFormattedTime(),
    timeLeftMinutes: totalMinutesLeft,
    cutoffs
  });
});

module.exports = router;
