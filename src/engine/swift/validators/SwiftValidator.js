// ======================================
// SWIFT VALIDATOR
// Pre-generation validation of payment instructions.
// Ensures all mandatory SWIFT fields are present and
// correctly formatted before rendering.
//
// Returns { valid, errors[] } — never throws.
// ======================================

// Standard 3-letter ISO 4217 currency codes
const VALID_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "HKD",
  "SEK", "NOK", "DKK", "NZD", "SGD", "ZAR", "CNY", "INR",
  "BRL", "MXN", "PLN", "CZK", "HUF", "TRY", "KRW", "THB",
  "MYR", "IDR", "PHP", "TWD", "ILS", "AED", "SAR", "QAR",
  "KWD", "BHD", "OMR", "EGP", "NGN", "KES", "GHS", "TZS"
]);

/**
 * Validate a payment instruction before SWIFT generation.
 *
 * @param {Object} instruction - PaymentInstruction object
 * @param {string} messageType - "MT103", "MT202", or "MT202COV"
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validate(instruction, messageType) {
  const errors = [];

  // ── 1. Economics (always mandatory) ──
  if (!instruction.amount || instruction.amount <= 0) {
    errors.push("Amount must be a positive number.");
  }

  if (!instruction.currency) {
    errors.push("Currency is required.");
  } else if (!VALID_CURRENCIES.has(instruction.currency.toUpperCase())) {
    errors.push(`Currency "${instruction.currency}" is not a recognised ISO 4217 code.`);
  }

  if (!instruction.valueDate) {
    errors.push("Value date is required.");
  }

  // ── 2. References ──
  if (!instruction.tradeRef) {
    errors.push("Trade reference is required.");
  }

  // ── 3. BIC validation ──
  if (!instruction.senderBIC) {
    errors.push("Sender BIC is required.");
  } else if (!isValidBIC(instruction.senderBIC)) {
    errors.push(`Sender BIC "${instruction.senderBIC}" is not a valid SWIFT BIC format.`);
  }

  if (!instruction.receiverBIC) {
    errors.push("Receiver BIC is required.");
  } else if (!isValidBIC(instruction.receiverBIC)) {
    errors.push(`Receiver BIC "${instruction.receiverBIC}" is not a valid SWIFT BIC format.`);
  }

  // ── 4. Ordering Institution ──
  if (!instruction.orderingInstitution || !instruction.orderingInstitution.bic) {
    errors.push("Ordering institution BIC is required.");
  }

  // ── 5. Beneficiary ──
  if (!instruction.beneficiary || !instruction.beneficiary.name) {
    errors.push("Beneficiary name is required.");
  }

  // ── 6. Account numbers ──
  if (messageType === "MT103") {
    if (!instruction.beneficiary || !instruction.beneficiary.account) {
      errors.push("Beneficiary account number is required for MT103.");
    }
  }

  // ── 7. Intermediary validation (for MT202COV) ──
  if (messageType === "MT202COV") {
    if (!instruction.intermediary || !instruction.intermediary.bank) {
      errors.push("Intermediary/Agent bank is required for MT202COV.");
    }
    if (!instruction.intermediary || !instruction.intermediary.bic) {
      errors.push("Intermediary BIC is required for MT202COV.");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate BIC/SWIFT code format.
 * BIC format: 8 or 11 alphanumeric characters.
 *   - 4 bank code (alpha)
 *   - 2 country code (alpha)
 *   - 2 location code (alphanum)
 *   - 3 branch code (alphanum, optional — XXX for head office)
 */
function isValidBIC(bic) {
  if (!bic) return false;
  const cleaned = String(bic).replace(/\s/g, "").toUpperCase();
  // Accept 8 or 11 character BICs
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
}

module.exports = {
  validate,
  isValidBIC
};
