const simulationClock = require("./clock")

// G10 Currency Cut-Off Table (Operational Time ET)
const CURRENCY_CUTOFF = {
  USD: "18:00",
  EUR: "16:00",
  GBP: "16:00",
  JPY: "14:00",
  CHF: "16:00",
  CAD: "15:30",
  AUD: "14:30",
  NZD: "13:30",
  SEK: "16:00",
  NOK: "16:00"
}


// ---------------------------------
// Convert HH:MM → minutes
// ---------------------------------
function timeToMinutes(timeStr) {

  const [h, m] = timeStr.split(":").map(Number)

  return h * 60 + m

}


// ---------------------------------
// Get Cutoff Minutes (NEW)
// ---------------------------------
function getCutoffMinutes(currency) {

  if (!CURRENCY_CUTOFF[currency]) {
    throw new Error(`Unsupported currency ${currency}`)
  }

  return timeToMinutes(CURRENCY_CUTOFF[currency])

}


// ---------------------------------
// Check if Cutoff Breached
// ---------------------------------
function isCutOffBreached(currency) {

  const simulatedTimestamp = simulationClock.getFormattedTime()

  const simulatedDate = new Date(simulatedTimestamp)

  const simulatedTime =
    simulatedDate.getUTCHours().toString().padStart(2, "0") +
    ":" +
    simulatedDate.getUTCMinutes().toString().padStart(2, "0")

  if (!CURRENCY_CUTOFF[currency]) {
    throw new Error(`Unsupported currency ${currency}`)
  }

  const cutoffTime = CURRENCY_CUTOFF[currency]

  const simMinutes = timeToMinutes(simulatedTime)
  const cutoffMinutes = timeToMinutes(cutoffTime)

  return simMinutes > cutoffMinutes

}


// ---------------------------------
// Export
// ---------------------------------
module.exports = {
  isCutOffBreached,
  getCutoffMinutes,
  CURRENCY_CUTOFF
}