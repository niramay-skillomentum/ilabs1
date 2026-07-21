// ======================================
// PAYMENT INSTRUCTION (CANONICAL DATA OBJECT)
// Direction-aware mapping from settled trade data to a
// standardised payment instruction structure.
//
// This is the single source of truth for all field mappers.
// It resolves who is the sender vs receiver based on direction.
//
//   BUY  → PAY:     Our Bank = Ordering,   Counterparty = Beneficiary
//   SELL → RECEIVE: Counterparty = Ordering, Our Bank = Beneficiary
// ======================================

/**
 * Build a canonical PaymentInstruction from trade + entity + SSI data.
 *
 * @param {Object} trade          - Settled trade document (lean)
 * @param {Object} ourBank        - Entity document (our bank for this currency)
 * @param {Object} counterpartySSI - SSIReference document (counterparty SSI)
 * @returns {Object} PaymentInstruction
 */
function build(trade, ourBank, counterpartySSI) {
  const direction = resolveDirection(trade.direction);

  // Base payment economics (always from trade)
  const instruction = {
    // References
    tradeRef: trade.tradeRef,
    settlementRef: trade.tradeRef,   // Settlement ref = trade ref in this system
    relatedRef: trade.tradeRef,

    // Economics (always from trade — source of truth)
    amount: trade.amount,
    currency: trade.currency,
    valueDate: trade.valueDate,

    // Payment direction
    paymentDirection: direction,
    tradeDirection: trade.direction,

    // Our Bank details (from Entity Master)
    ourBank: {
      name: ourBank.entityName,
      bic: ourBank.bic || "",
      accountNumber: ourBank.accountNumber || "",
      accountName: ourBank.accountName || "",
      address: ourBank.address || "",
      entityCode: ourBank.entityCode
    },

    // Counterparty details (from SSI Reference)
    counterparty: {
      name: counterpartySSI.counterPartyName || counterpartySSI.groupCounterPartyName || "",
      groupName: counterpartySSI.groupCounterPartyName || "",
      bic: counterpartySSI.swiftBicCode || "",
      accountNumber: counterpartySSI.accountNumber ? String(counterpartySSI.accountNumber) : "",
      accountWithInstitution: counterpartySSI.accountWithInstitution || "",
      finalBeneficiary: counterpartySSI.finalBeneficiary || "",
      country: counterpartySSI.country || counterpartySSI.registeredCountry || "",
      defaultSwift: counterpartySSI.defaultSwift || "",
      counterpartyType: counterpartySSI.counterpartyType || ""
    },

    // Intermediary / Agent Bank (from SSI Reference)
    intermediary: {
      bank: counterpartySSI.agentBank || null,
      bic: counterpartySSI.agentSwiftCode || null,
      account: counterpartySSI.accountAtAgent ? String(counterpartySSI.accountAtAgent) : null
    },

    // Additional instructions
    field72: counterpartySSI.field72 || null,
    charges: counterpartySSI.swift71A || "SHA",   // Fallback to Shared charges

    // Direction-resolved roles
    orderingInstitution: null,
    beneficiaryInstitution: null,
    orderingCustomer: null,
    beneficiary: null
  };

  // ── Resolve sender/receiver based on direction ──
  if (direction === "PAY") {
    // We are paying → Our Bank is ordering, Counterparty is beneficiary
    instruction.orderingInstitution = {
      bic: instruction.ourBank.bic,
      name: instruction.ourBank.name,
      account: instruction.ourBank.accountNumber,
      address: instruction.ourBank.address
    };
    instruction.beneficiaryInstitution = {
      bic: instruction.counterparty.bic,
      name: instruction.counterparty.accountWithInstitution || instruction.counterparty.name,
      account: instruction.counterparty.accountNumber
    };
    instruction.orderingCustomer = {
      account: instruction.ourBank.accountNumber,
      name: instruction.ourBank.accountName || instruction.ourBank.name,
      address: instruction.ourBank.address
    };
    instruction.beneficiary = {
      account: instruction.counterparty.accountNumber,
      name: instruction.counterparty.finalBeneficiary || instruction.counterparty.name,
      address: instruction.counterparty.country
    };
    instruction.senderBIC = instruction.ourBank.bic;
    instruction.receiverBIC = instruction.counterparty.bic;
  } else {
    // We are receiving → Counterparty is ordering, Our Bank is beneficiary
    instruction.orderingInstitution = {
      bic: instruction.counterparty.bic,
      name: instruction.counterparty.accountWithInstitution || instruction.counterparty.name,
      account: instruction.counterparty.accountNumber
    };
    instruction.beneficiaryInstitution = {
      bic: instruction.ourBank.bic,
      name: instruction.ourBank.name,
      account: instruction.ourBank.accountNumber
    };
    instruction.orderingCustomer = {
      account: instruction.counterparty.accountNumber,
      name: instruction.counterparty.finalBeneficiary || instruction.counterparty.name,
      address: instruction.counterparty.country
    };
    instruction.beneficiary = {
      account: instruction.ourBank.accountNumber,
      name: instruction.ourBank.accountName || instruction.ourBank.name,
      address: instruction.ourBank.address
    };
    instruction.senderBIC = instruction.counterparty.bic;
    instruction.receiverBIC = instruction.ourBank.bic;
  }

  return instruction;
}

/**
 * Map trade direction to payment direction.
 *   BUY  → PAY     (we pay the counterparty)
 *   SELL → RECEIVE (we receive from the counterparty)
 */
function resolveDirection(tradeDirection) {
  const dir = String(tradeDirection || "").toUpperCase().trim();
  if (dir === "BUY" || dir === "PAY") return "PAY";
  if (dir === "SELL" || dir === "RECEIVE") return "RECEIVE";
  // Default to PAY for safety
  return "PAY";
}

module.exports = {
  build,
  resolveDirection
};
