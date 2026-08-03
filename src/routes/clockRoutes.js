const express = require("express");
const router = express.Router();
const simulationClock = require("../engine/clock");

// ======================================
// CLOCK API
// ======================================
router.get("/", (req, res) => {
  const now = simulationClock.getTime();

  const hours = now.getHours();
  const minutes = now.getMinutes();

  const totalMinutesLeft = (18 * 60) - (hours * 60 + minutes);

  res.json({
    simTime: simulationClock.getFormattedTime(),
    timeLeftMinutes: totalMinutesLeft
  });
});

module.exports = router;
