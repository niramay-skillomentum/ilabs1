// ======================================
// MT103 FIELD MAP
// Maps a PaymentInstruction to SWIFT MT103 fields.
//
// MT103 — Single Customer Credit Transfer
// Used when: Default SWIFT = MT103 (NON BANK counterparty)
//            AND no Agent Bank → MT103 only
//            OR  with Agent Bank → MT103 + MT202COV pair
// ======================================

/**
 * Map a PaymentInstruction to MT103 SWIFT field tags.
 *
 * @param {Object} instruction - PaymentInstruction
 * @returns {Object} Ordered map of { tag: { value, description } }
 */
function mapFields(instruction) {
  const fields = {};

  // :20: Transaction Reference Number
  fields["20"] = {
    value: truncate(instruction.tradeRef, 16),
    description: "Transaction Reference Number"
  };

  // :23B: Bank Operation Code
  fields["23B"] = {
    value: "CRED",
    description: "Bank Operation Code"
  };

  // :32A: Value Date / Currency / Interbank Settled Amount
  fields["32A"] = {
    value: formatField32A(instruction.valueDate, instruction.currency, instruction.amount),
    description: "Value Date/Currency/Interbank Settled Amount"
  };

  // :50K: Ordering Customer (Name & Address)
  fields["50K"] = {
    value: formatField50K(instruction.orderingCustomer),
    description: "Ordering Customer"
  };

  // :52A: Ordering Institution (BIC)
  if (instruction.orderingInstitution && instruction.orderingInstitution.bic) {
    fields["52A"] = {
      value: formatFieldBIC(instruction.orderingInstitution),
      description: "Ordering Institution"
    };
  }

  // :53A: Sender's Correspondent (optional — only if intermediary exists on sender side)
  // Typically used when routing through a correspondent bank

  // :56A: Intermediary Institution (Agent Bank)
  if (instruction.intermediary && instruction.intermediary.bank) {
    fields["56A"] = {
      value: formatFieldIntermediary(instruction.intermediary),
      description: "Intermediary Institution"
    };
  }

  // :57A: Account With Institution (Beneficiary's Bank)
  if (instruction.beneficiaryInstitution) {
    fields["57A"] = {
      value: formatFieldAccountWithInstitution(instruction.beneficiaryInstitution),
      description: "Account With Institution"
    };
  }

  // :59: Beneficiary Customer
  fields["59"] = {
    value: formatField59(instruction.beneficiary),
    description: "Beneficiary Customer"
  };

  // :70: Remittance Information
  fields["70"] = {
    value: `/RFB/${instruction.tradeRef}`,
    description: "Remittance Information"
  };

  // :71A: Details of Charges
  fields["71A"] = {
    value: instruction.charges || "SHA",
    description: "Details of Charges"
  };

  // :72: Sender to Receiver Information
  if (instruction.field72) {
    fields["72"] = {
      value: formatField72(instruction.field72),
      description: "Sender to Receiver Information"
    };
  }

  return fields;
}

// ============================
// FIELD FORMATTERS
// ============================

/**
 * Format :32A: — YYMMDDCURRENCYAMOUNT
 * Example: 250720USD1500000,00
 */
function formatField32A(valueDate, currency, amount) {
  const d = new Date(valueDate);
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const formattedAmount = formatSwiftAmount(amount);
  return `${yy}${mm}${dd}${currency.toUpperCase()}${formattedAmount}`;
}

/**
 * Format :50K: — Ordering Customer (account + name + address)
 */
function formatField50K(customer) {
  const lines = [];
  if (customer.account) lines.push(`/${customer.account}`);
  if (customer.name) lines.push(customer.name);
  if (customer.address) {
    // Split long addresses into 35-char lines
    const addrLines = wrapText(cleanAddress(customer.address), 35);
    lines.push(...addrLines);
  }
  return lines.join("\n");
}

/**
 * Format BIC-based field (:52A:, :57A:)
 */
function formatFieldBIC(institution) {
  const lines = [];
  if (institution.account) lines.push(`/${institution.account}`);
  lines.push(institution.bic);
  return lines.join("\n");
}

/**
 * Format :56A: — Intermediary (Agent Bank)
 */
function formatFieldIntermediary(intermediary) {
  const lines = [];
  if (intermediary.account) lines.push(`/${intermediary.account}`);
  if (intermediary.bic) {
    lines.push(intermediary.bic);
  } else if (intermediary.bank) {
    lines.push(intermediary.bank);
  }
  return lines.join("\n");
}

/**
 * Format :57A: — Account With Institution
 */
function formatFieldAccountWithInstitution(institution) {
  const lines = [];
  if (institution.account) lines.push(`/${institution.account}`);
  if (institution.bic) {
    lines.push(institution.bic);
  }
  if (institution.name && !institution.bic) {
    lines.push(institution.name);
  }
  return lines.join("\n");
}

/**
 * Format :59: — Beneficiary Customer
 */
function formatField59(beneficiary) {
  const lines = [];
  if (beneficiary.account) lines.push(`/${beneficiary.account}`);
  if (beneficiary.name) lines.push(beneficiary.name);
  if (beneficiary.address) {
    const addrLines = wrapText(cleanAddress(beneficiary.address), 35);
    lines.push(...addrLines);
  }
  return lines.join("\n");
}

/**
 * Format :72: — Sender to Receiver Information
 * Each line prefixed with //
 */
function formatField72(field72Value) {
  if (!field72Value) return "";
  const lines = String(field72Value).split(/[\r\n]+/).filter(l => l.trim());
  return lines.map(l => l.startsWith("/") ? l : `//${l.trim()}`).join("\n");
}

// ============================
// UTILITIES
// ============================

function formatSwiftAmount(amount) {
  // SWIFT uses comma as decimal separator
  const parts = Number(amount).toFixed(2).split(".");
  return `${parts[0]},${parts[1]}`;
}

function truncate(str, maxLen) {
  if (!str) return "";
  return String(str).substring(0, maxLen);
}

function cleanAddress(address) {
  if (!address) return "";
  return String(address).replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function wrapText(text, maxLen) {
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxLen) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4); // SWIFT max 4 address lines
}

module.exports = {
  mapFields,
  formatField32A,
  formatSwiftAmount
};
