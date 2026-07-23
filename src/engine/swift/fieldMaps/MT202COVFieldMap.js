// ======================================
// MT202 COV FIELD MAP
// Maps a PaymentInstruction to SWIFT MT202 COV fields.
//
// MT202 COV — Cover Payment
// Used when: Default SWIFT = MT103 (NON BANK counterparty)
//            AND Agent Bank exists
// Always generated as a PAIR with MT103.
//
// The MT202 COV contains the cover (interbank) leg while
// the paired MT103 contains the customer payment details.
//
// Structure:
//   Sequence A — General Information (same as MT202)
//   Sequence B — Underlying Customer Credit Transfer (MT103 fields)
// ======================================

const { formatField32A, formatSwiftAmount } = require("./MT103FieldMap");

/**
 * Map a PaymentInstruction to MT202 COV SWIFT field tags.
 *
 * @param {Object} instruction - PaymentInstruction
 * @returns {Object} Ordered map of { tag: { value, description } }
 */
function mapFields(instruction) {
  const fields = {};

  // ============================
  // SEQUENCE A — General Information
  // ============================

  // :20: Transaction Reference Number
  fields["20"] = {
    value: instruction.transactionRef,
    description: "Transaction Reference Number"
  };

  // :21: Related Reference (links to the MT103)
  fields["21"] = {
    value: instruction.corrRef,
    description: "Related Reference"
  };

  // :32A: Value Date / Currency / Amount
  fields["32A"] = {
    value: formatField32A(instruction.valueDate, instruction.currency, instruction.amount),
    description: "Value Date/Currency/Interbank Settled Amount"
  };

  // :52A: Ordering Institution (our bank for the cover leg)
  if (instruction.orderingInstitution && instruction.orderingInstitution.bic) {
    fields["52A"] = {
      value: instruction.orderingInstitution.bic,
      description: "Ordering Institution"
    };
  }

  // :56A: Intermediary Institution (Agent Bank — the cover bank)
  if (instruction.intermediary && instruction.intermediary.bank) {
    const lines = [];
    if (instruction.intermediary.account) {
      lines.push(`/${instruction.intermediary.account}`);
    }
    if (instruction.intermediary.bic) {
      lines.push(instruction.intermediary.bic);
    }
    fields["56A"] = {
      value: lines.join("\n"),
      description: "Intermediary Institution"
    };
  }

  // :57A: Account With Institution
  if (instruction.beneficiaryInstitution && instruction.beneficiaryInstitution.bic) {
    const lines = [];
    if (instruction.beneficiaryInstitution.account) {
      lines.push(`/${instruction.beneficiaryInstitution.account}`);
    }
    lines.push(instruction.beneficiaryInstitution.bic);
    fields["57A"] = {
      value: lines.join("\n"),
      description: "Account With Institution"
    };
  }

  // :58A: Beneficiary Institution
  {
    const bene = instruction.beneficiary || {};
    const beneInst = instruction.beneficiaryInstitution || {};
    const lines = [];
    if (bene.account) lines.push(`/${bene.account}`);
    if (beneInst.bic) lines.push(beneInst.bic);
    else if (beneInst.name) lines.push(beneInst.name);
    fields["58A"] = {
      value: lines.join("\n"),
      description: "Beneficiary Institution"
    };
  }

  // ============================
  // SEQUENCE B — Underlying Customer Credit Transfer
  // (Mirrors key MT103 fields for the customer payment)
  // ============================

  // :50K: Ordering Customer (from the underlying MT103)
  {
    const lines = [];
    if (instruction.orderingCustomer) {
      if (instruction.orderingCustomer.account) lines.push(`/${instruction.orderingCustomer.account}`);
      if (instruction.orderingCustomer.name) lines.push(instruction.orderingCustomer.name);
    }
    fields["50K"] = {
      value: lines.join("\n"),
      description: "Ordering Customer (Underlying)"
    };
  }

  // :59: Beneficiary Customer (from the underlying MT103)
  {
    const lines = [];
    if (instruction.beneficiary) {
      if (instruction.beneficiary.account) lines.push(`/${instruction.beneficiary.account}`);
      if (instruction.beneficiary.name) lines.push(instruction.beneficiary.name);
    }
    fields["59"] = {
      value: lines.join("\n"),
      description: "Beneficiary Customer (Underlying)"
    };
  }

  // :33B: Currency/Original Ordered Amount (underlying)
  fields["33B"] = {
    value: `${instruction.currency.toUpperCase()}${formatSwiftAmount(instruction.amount)}`,
    description: "Currency/Original Ordered Amount"
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

function truncate(str, maxLen) {
  if (!str) return "";
  return String(str).substring(0, maxLen);
}

module.exports = {
  mapFields
};
