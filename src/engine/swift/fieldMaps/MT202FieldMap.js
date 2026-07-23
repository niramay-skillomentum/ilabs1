// ======================================
// MT202 FIELD MAP
// Maps a PaymentInstruction to SWIFT MT202 fields.
//
// MT202 — General Financial Institution Transfer
// Used when: Default SWIFT = MT202 (BANK counterparty)
// Bank-to-bank transfer — no customer details.
// ======================================

const { formatField32A, formatSwiftAmount } = require("./MT103FieldMap");

/**
 * Map a PaymentInstruction to MT202 SWIFT field tags.
 *
 * @param {Object} instruction - PaymentInstruction
 * @returns {Object} Ordered map of { tag: { value, description } }
 */
function mapFields(instruction) {
  const fields = {};

  // :20: Transaction Reference Number
  fields["20"] = {
    value: instruction.transactionRef,
    description: "Transaction Reference Number"
  };

  // :21: Related Reference
  fields["21"] = {
    value: instruction.corrRef,
    description: "Related Reference"
  };

  // :32A: Value Date / Currency / Amount
  fields["32A"] = {
    value: formatField32A(instruction.valueDate, instruction.currency, instruction.amount),
    description: "Value Date/Currency/Interbank Settled Amount"
  };

  // :52A: Ordering Institution
  if (instruction.orderingInstitution && instruction.orderingInstitution.bic) {
    const lines = [];
    if (instruction.orderingInstitution.account) {
      lines.push(`/${instruction.orderingInstitution.account}`);
    }
    lines.push(instruction.orderingInstitution.bic);
    fields["52A"] = {
      value: lines.join("\n"),
      description: "Ordering Institution"
    };
  }

  // :56A: Intermediary Institution (if present)
  if (instruction.intermediary && instruction.intermediary.bank) {
    const lines = [];
    if (instruction.intermediary.account) {
      lines.push(`/${instruction.intermediary.account}`);
    }
    if (instruction.intermediary.bic) {
      lines.push(instruction.intermediary.bic);
    } else {
      lines.push(instruction.intermediary.bank);
    }
    fields["56A"] = {
      value: lines.join("\n"),
      description: "Intermediary Institution"
    };
  }

  // :57A: Account With Institution (Receiver's Correspondent)
  if (instruction.beneficiaryInstitution) {
    const lines = [];
    if (instruction.beneficiaryInstitution.account) {
      lines.push(`/${instruction.beneficiaryInstitution.account}`);
    }
    if (instruction.beneficiaryInstitution.bic) {
      lines.push(instruction.beneficiaryInstitution.bic);
    }
    fields["57A"] = {
      value: lines.join("\n"),
      description: "Account With Institution"
    };
  }

  // :58A: Beneficiary Institution
  fields["58A"] = {
    value: formatBeneficiaryInstitution(instruction),
    description: "Beneficiary Institution"
  };

  // :72: Sender to Receiver Information
  if (instruction.field72) {
    const lines = String(instruction.field72).split(/[\r\n]+/).filter(l => l.trim());
    fields["72"] = {
      value: lines.map(l => l.startsWith("/") ? l : `//${l.trim()}`).join("\n"),
      description: "Sender to Receiver Information"
    };
  }

  return fields;
}

/**
 * Format :58A: — Beneficiary Institution
 */
function formatBeneficiaryInstitution(instruction) {
  const lines = [];
  const bene = instruction.beneficiary || {};
  const beneInst = instruction.beneficiaryInstitution || {};

  if (bene.account) lines.push(`/${bene.account}`);
  if (beneInst.bic) {
    lines.push(beneInst.bic);
  } else if (beneInst.name) {
    lines.push(beneInst.name);
  } else if (bene.name) {
    lines.push(bene.name);
  }
  return lines.join("\n");
}

function truncate(str, maxLen) {
  if (!str) return "";
  return String(str).substring(0, maxLen);
}

module.exports = {
  mapFields
};
