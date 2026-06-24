// ======================================
// AGE CALCULATOR (DESK-SPECIFIC)
// Centralised trade age calculation with
// separate rules for each desk.
//
// MO Desk:
//   age = calendar days between currentDate and tradeDate
//   (today = 0, yesterday = 1, etc.)
//
// Confirmation Desk:
//   age = max(0, calendar days between currentDate and (tradeDate + 1 day))
//   T+0 and T+1 both yield age 0 (grace period)
//   Age starts counting only after T+1
// ======================================

/**
 * Strip time component and return calendar-day difference.
 * Positive result means currentDate is after baseDate.
 */
function calendarDayDiff(currentDate, baseDate) {
  const cur = new Date(currentDate);
  const base = new Date(baseDate);

  // Zero out time to compare calendar dates only
  cur.setHours(0, 0, 0, 0);
  base.setHours(0, 0, 0, 0);

  const diffMs = cur - base;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * MO Desk age: simple calendar-day difference from tradeDate.
 *
 * @param {Date|string} tradeDate
 * @param {Date|string} [currentDate=now]
 * @returns {number} age in calendar days (min 0)
 */
function calculateMOAge(tradeDate, currentDate = new Date()) {
  return Math.max(0, calendarDayDiff(currentDate, tradeDate));
}

/**
 * Confirmation Desk age: calendar-day difference from tradeDate + 1 day.
 * Trades within T+1 of tradeDate get age 0 (grace period).
 *
 * @param {Date|string} tradeDate
 * @param {Date|string} [currentDate=now]
 * @returns {number} age in calendar days (min 0)
 */
function calculateConfirmationAge(tradeDate, currentDate = new Date()) {
  const tPlus1 = new Date(tradeDate);
  tPlus1.setDate(tPlus1.getDate() + 1);

  return Math.max(0, calendarDayDiff(currentDate, tPlus1));
}

/**
 * Dispatcher — calculates age based on desk.
 *
 * @param {Date|string} tradeDate
 * @param {Date|string} currentDate
 * @param {string}      desk — "MO", "CONFIRMATION", "SETTLEMENT", etc.
 * @returns {number}
 */
function calculateAge(tradeDate, currentDate, desk) {
  if (!tradeDate) return 0;

  switch (desk) {
    case "MO":
      return calculateMOAge(tradeDate, currentDate);
    case "CONFIRMATION":
      return calculateConfirmationAge(tradeDate, currentDate);
    default:
      // Fallback: use MO-style for any other desk
      return calculateMOAge(tradeDate, currentDate);
  }
}

module.exports = {
  calculateMOAge,
  calculateConfirmationAge,
  calculateAge,
  calendarDayDiff
};
