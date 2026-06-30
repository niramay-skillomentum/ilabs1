// ======================================
// TRUTH ENGINE (V2 — DESK-AWARE)
// Verifies user claims against desk-specific truths
// ======================================

let scenarioStore = [];


/**
 * Load scenarios from scenarioEngine
 */
function loadScenarios(scenarios) {
  scenarioStore = scenarios;
}


/**
 * Get scenario by tradeRef
 */
function getScenario(tradeRef) {

  return scenarioStore.find(
    s => s.tradeRef === tradeRef
  );

}


/**
 * Verify reference
 */
function verifyReference(tradeRef, reference) {

  const scenario = getScenario(tradeRef);

  if (!scenario) return null;

  if (scenario.breakType === "REFERENCE_MISMATCH") {

    return {
      correct: false,
      correctReference: "REF99881"
    };

  }

  return {
    correct: true,
    correctReference: reference
  };

}


/**
 * Verify payment status
 */
function checkPaymentReceived(tradeRef) {

  const scenario = getScenario(tradeRef);

  if (!scenario) return null;

  if (scenario.breakType === "PAYMENT_NOT_RECEIVED") {

    return {
      paymentReceived: false
    };

  }

  return {
    paymentReceived: true
  };

}


/**
 * Verify SSI
 */
function verifySSI(tradeRef) {

  const scenario = getScenario(tradeRef);

  if (!scenario) return null;

  if (scenario.breakType === "SSI_MISMATCH") {

    return {
      correct: false,
      correctSSI: "CITIUS33XXX"
    };

  }

  return {
    correct: true
  };

}

function getTruth(tradeRef) {

  const referenceCheck = verifyReference(tradeRef);
  const payment = checkPaymentReceived(tradeRef);
  const ssi = verifySSI(tradeRef);

  return {
    tradeRef,
    reference: referenceCheck.correctReference,
    paymentReceived: payment.paymentReceived,
    ssiCorrect: ssi.correct
  };
}

/**
 * Helper: Get the truth object for a specific desk.
 * Falls back to trade.truths.mo → trade.truth for backward compatibility.
 */
function getDeskTruth(trade, desk = "mo") {
  const deskKey = desk.toLowerCase();
  if (trade.truths && trade.truths[deskKey]) {
    return trade.truths[deskKey];
  }
  // Fallback for legacy trades
  if (trade.truths && trade.truths.mo) {
    return trade.truths.mo;
  }
  return null;
}

/**
 * Get mismatch fields between a desk's truth and the booking.
 * @param {Object} trade - The trade object
 * @param {string} desk - "mo" or "confirmation" (default: "mo")
 * @returns {string[]} Array of mismatched field names
 */
function getMismatchFields(trade, desk = "mo") {

  const truth = getDeskTruth(trade, desk);
  const booking = trade.booking;

  if (!truth || !booking) {
    return [];
  }

  const mismatches = [];

  if (truth.amount !== undefined && truth.amount !== booking.amount) {
    mismatches.push("amount");
  }

  if (truth.valueDate && booking.valueDate &&
      truth.valueDate !== booking.valueDate) {
    if (new Date(truth.valueDate).getTime() !== new Date(booking.valueDate).getTime()) {
      mismatches.push("valueDate");
    }
  }

  if (truth.currency !== undefined && truth.currency !== booking.currency) {
    mismatches.push("currency");
  }

  // Counterparty mismatch — only for MO (not confirmation)
  if (desk.toLowerCase() === "mo" && truth.counterparty !== undefined && truth.counterparty !== booking.counterparty) {
    mismatches.push("counterparty");
  }

  return mismatches;
  
}

/**
 * Get confirmation-level mismatches.
 * Compares the trade's current economics (top-level fields, after MO amendments)
 * against truths.confirmation (what the counterparty expects).
 * @param {Object} trade - The trade object
 * @returns {Object[]} Array of mismatch objects with field, tradeValue, cptyValue
 */
function getConfirmationMismatches(trade, desk = "confirmation") {
  const confirmTruth = trade.truths?.[desk];
  if (!confirmTruth) return [];

  const mismatches = [];

  // Compare trade's current top-level economics vs confirmation truth
  if (confirmTruth.amount !== undefined && trade.amount !== confirmTruth.amount) {
    mismatches.push({
      field: "amount",
      tradeValue: trade.amount,
      cptyExpected: confirmTruth.amount
    });
  }

  if (confirmTruth.valueDate !== undefined && trade.valueDate) {
    if (new Date(trade.valueDate).getTime() !== new Date(confirmTruth.valueDate).getTime()) {
      mismatches.push({
        field: "valueDate",
        tradeValue: trade.valueDate,
        cptyExpected: confirmTruth.valueDate
      });
    }
  }

  if (confirmTruth.currency !== undefined && trade.currency !== confirmTruth.currency) {
    mismatches.push({
      field: "currency",
      tradeValue: trade.currency,
      cptyExpected: confirmTruth.currency
    });
  }

  return mismatches;
}

/**
 * Get settlement-level mismatches.
 * Compares the trade's settlementDetails against truths.settlement.
 * @param {Object} trade - The trade object
 * @returns {Object[]} Array of mismatch objects with field, tradeValue, cptyExpected
 */
function getSettlementMismatches(trade) {
  const system = trade.settlementDetails || {};
  const truth = trade.truths?.settlement || {};
  
  const fieldsToCheck = [
    "beneficiaryName", "beneficiaryBank", "beneficiaryBIC",
    "accountNumber", "accountType", "currency",
    "settlementMethod", "correspondentBank", "paymentReference"
  ];

  const mismatches = [];

  for (const field of fieldsToCheck) {
    if (system[field] !== truth[field]) {
      mismatches.push({
        field: field,
        tradeValue: system[field],
        cptyExpected: truth[field]
      });
    }
  }

  return mismatches;
}

module.exports = {
  verifyReference,
  checkPaymentReceived,
  verifySSI,
  getTruth,
  getScenario,
  getMismatchFields,
  getDeskTruth,
  getConfirmationMismatches,
  getSettlementMismatches
};