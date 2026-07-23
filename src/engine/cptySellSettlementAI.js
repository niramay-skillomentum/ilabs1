const PendingReply = require("../models/PendingReply");
const Entity = require("../models/Entity");
const conversationEngine = require("./conversationEngine");

// Schedules a proactive email from the CPTY stating their intent to settle and the SSI they will use
async function scheduleProactiveSellSSI(trade, isCorrect = true) {
  // Random delay between 3 and 8 seconds
  const delay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
  
  const Trade = require("../models/Trade");
  await Trade.updateOne(
    { tradeRef: trade.tradeRef },
    { $set: { "truths.settlement.cptyProvidedCorrectSSI": isCorrect } }
  );

  // Find the entity
  let entity = await Entity.findOne({ entityName: trade.entity, currency: trade.currency });
  if (!entity) {
    console.warn("[Sell Settlement AI] Entity not found for trade", trade.tradeRef);
    return;
  }

  const formatAmount = (num) => Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let emailBody = "";
  let subject = "";

  if (trade.settlementType === "ELECTRONIC") {
    subject = `Request for Settlement Confirmation – Trade ${trade.tradeRef}`;
    emailBody = `Dear Settlement Team,

We kindly request your confirmation of the below electronic settlement instruction at your earliest convenience to facilitate timely processing for the scheduled value date.

Trade Details
• Trade Reference: ${trade.tradeRef}
• Product: ${trade.product || "Unknown Product"}
• Buy/Sell: SELL
• Counterparty: ${trade.counterparty}
• Trade Date: ${trade.tradeDate ? new Date(trade.tradeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ""}
• Value Date: ${trade.valueDate ? new Date(trade.valueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ""}
• Settlement Currency: ${trade.currency}
• Settlement Amount: ${formatAmount(trade.amount)}
• Settlement Method: Electronic Funds Transfer

Please review the settlement details and confirm your acceptance of the instruction. Should you identify any discrepancies or require clarification, kindly contact us as soon as possible to avoid any settlement delays.

We appreciate your prompt attention to this matter.

Kind regards,

${trade.counterparty}
Settlement Operations

SWIFT BIC: ${trade.counterparty.substring(0, 8) + "XXX"}
Email: settlements@${trade.counterparty.toLowerCase().replace(/ /g, '')}.com
Phone: +44 20 7946 0958`;
  } else {
    // BILATERAL
    subject = `Settlement Details for Trade ${trade.tradeRef}`;
    
    let beneficiaryName = entity.accountName || entity.entityName;
    let beneficiaryBank = entity.accountWithInstitution || "";
    let accountNumber = entity.accountNumber;
    let bic = entity.bic;
    let currency = entity.currency;
    let correspondentBank = entity.correspondentBank || "";
    let intermediaryBank = entity.intermediaryBank || "";
    let paymentReference = trade.tradeRef;

    if (!isCorrect) {
      // Introduce a realistic error
      accountNumber = accountNumber.substring(0, accountNumber.length - 2) + "99";
    }

    emailBody = `Dear Settlement Team,

Please be advised that we are preparing to settle our SELL trade ${trade.tradeRef} with you.
We have the following Standard Settlement Instructions on file to send the funds to:

Beneficiary Name: ${beneficiaryName}
Beneficiary Bank: ${beneficiaryBank}
Beneficiary BIC: ${bic}
Account Number: ${accountNumber}
Currency: ${currency}
Settlement Method: SWIFT
${correspondentBank ? `Correspondent Bank: ${correspondentBank}\n` : ""}${intermediaryBank ? `Intermediary Bank: ${intermediaryBank}\n` : ""}Payment Reference: ${paymentReference}

Please confirm if these details are correct so we can proceed with the payment.

Best regards,
Counterparty Settlements`;
  }

  await PendingReply.create({
    tradeRef: trade.tradeRef,
    replyType: "CPTY_EMAIL",
    isFinalReply: true, // we can process normally
    desk: "SETTLEMENT",
    payload: {
      followUpBody: emailBody,
      followUpSubject: subject
    },
    sendAt: new Date(Date.now() + delay)
  });
}

module.exports = {
  scheduleProactiveSellSSI
};
