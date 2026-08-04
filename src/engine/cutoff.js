const simulationClock = require("./clock")

// ======================================
// CURRENCY CUT-OFF TABLE (EST)
// Region-based settlement cut-off times
// ======================================

const CURRENCY_CUTOFF = {
  // Asian Region — 12:00 PM EST
  JPY: "12:00",
  HKD: "12:00",
  AUD: "12:00",

  // European Region — 2:00 PM EST
  EUR: "14:00",
  GBP: "14:00",
  CHF: "14:00",
  SEK: "14:00",

  // CAD/MXN Region — 5:00 PM EST
  CAD: "17:00",
  MXN: "17:00",

  // USD Region — 6:00 PM EST
  USD: "18:00",

  // Africa Region — 6:00 PM EST
  ZAR: "18:00"
}

// ======================================
// CURRENCY → REGION MAP (for display)
// ======================================

const CURRENCY_REGION = {
  JPY: "Asian Region",
  HKD: "Asian Region",
  AUD: "Asian Region",
  EUR: "European Region",
  GBP: "European Region",
  CHF: "European Region",
  SEK: "European Region",
  CAD: "CAD/MXN Region",
  MXN: "CAD/MXN Region",
  USD: "USD Region",
  ZAR: "Africa Region"
}


// ---------------------------------
// Convert HH:MM → minutes since midnight
// ---------------------------------
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number)
  return h * 60 + m
}


// ---------------------------------
// Get Cutoff Minutes for a currency
// ---------------------------------
function getCutoffMinutes(currency) {
  if (!CURRENCY_CUTOFF[currency]) {
    throw new Error(`Unsupported currency ${currency}`)
  }
  return timeToMinutes(CURRENCY_CUTOFF[currency])
}


// ---------------------------------
// Get human-readable cutoff time
// e.g. "12:00 PM EST"
// ---------------------------------
function getCutoffTimeForCurrency(currency) {
  if (!CURRENCY_CUTOFF[currency]) return null

  const timeStr = CURRENCY_CUTOFF[currency]
  const [h, m] = timeStr.split(":").map(Number)

  const period = h >= 12 ? "PM" : "AM"
  const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h)
  const displayM = String(m).padStart(2, "0")

  return `${displayH}:${displayM} ${period} EST`
}


// ---------------------------------
// Get region for a currency
// ---------------------------------
function getRegionForCurrency(currency) {
  return CURRENCY_REGION[currency] || "Unknown"
}


// ---------------------------------
// Get minutes until cutoff
// Returns negative if already breached
// ---------------------------------
function getMinutesUntilCutoff(currency, userId = null) {
  if (!CURRENCY_CUTOFF[currency]) return null

  const simTime = simulationClock.getTime(userId)
  const currentMinutes = simTime.getHours() * 60 + simTime.getMinutes()
  const cutoffMins = getCutoffMinutes(currency)

  return cutoffMins - currentMinutes
}


// ---------------------------------
// Check if Cutoff Breached
// Uses simulation clock local time
// ---------------------------------
function isCutOffBreached(currency, userId = null) {
  if (!CURRENCY_CUTOFF[currency]) {
    // Unknown currencies are not restricted
    return false
  }

  const simTime = simulationClock.getTime(userId)
  const currentMinutes = simTime.getHours() * 60 + simTime.getMinutes()
  const cutoffMins = getCutoffMinutes(currency)

  return currentMinutes > cutoffMins
}


// ---------------------------------
// Get cutoff status for all currencies
// Returns object with breached/remaining info
// ---------------------------------
function getAllCutoffStatuses(userId = null) {
  const statuses = {}

  for (const [currency, timeStr] of Object.entries(CURRENCY_CUTOFF)) {
    const breached = isCutOffBreached(currency, userId)
    const minutesLeft = getMinutesUntilCutoff(currency, userId)

    statuses[currency] = {
      time: timeStr,
      region: CURRENCY_REGION[currency],
      breached,
      minutesLeft: breached ? 0 : minutesLeft
    }
  }

  return statuses
}


// ---------------------------------
// Export
// ---------------------------------
module.exports = {
  isCutOffBreached,
  getCutoffMinutes,
  getCutoffTimeForCurrency,
  getRegionForCurrency,
  getMinutesUntilCutoff,
  getAllCutoffStatuses,
  CURRENCY_CUTOFF,
  CURRENCY_REGION
}