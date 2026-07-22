const PendingReply = require("../models/PendingReply");
const Entity = require("../models/Entity");
const conversationEngine = require("./conversationEngine");

// Schedules a proactive email from the CPTY stating their intent to settle and the SSI they will use
async function scheduleProactiveSellSSI(trade) {
  // Random delay between 3 and 8 seconds
  const delay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
  
  // Decide whether to give the correct or incorrect SSI (80% correct, 20% incorrect)
  const isCorrect = Math.random() < 0.8;
  
  const Trade = require("../models/Trade");
  await Trade.updateOne(
    { tradeRef: trade.tradeRef },
    { $set: { "truths.settlement.cptyProvidedCorrectSSI": isCorrect } }
  );
  // REMOVED await trade.save() to avoid ParallelSaveError with tradeRoutes.js and lean() errors

  // Find the entity
  let entity = await Entity.findOne({ entityName: trade.entity, currency: trade.currency });
  if (!entity) {
    console.warn("[Sell Settlement AI] Entity not found for trade", trade.tradeRef);
    return;
  }

  // Build the SSI details
  let beneficiaryName = entity.accountName || entity.entityName;
  let accountNumber = entity.accountNumber;
  let bic = entity.bic;
  let currency = entity.currency;

  if (!isCorrect) {
    // Introduce a realistic error
    accountNumber = accountNumber.substring(0, accountNumber.length - 2) + "99";
  }

  const emailBody = `Dear Settlement Team,

Please be advised that we are preparing to settle our SELL trade ${trade.tradeRef} with you.
We have the following Standard Settlement Instructions on file to send the funds to:

Currency: ${currency}
Beneficiary Name: ${beneficiaryName}
Beneficiary BIC: ${bic}
Account Number: ${accountNumber}

Please confirm if these details are correct so we can proceed with the payment.

Best regards,
Counterparty Settlements`;

  await PendingReply.create({
    tradeRef: trade.tradeRef,
    replyType: "CPTY_EMAIL",
    isFinalReply: true,
    desk: "SETTLEMENT",
    payload: {
      followUpBody: emailBody,
      followUpSubject: `Settlement Details for Trade ${trade.tradeRef}`
    },
    sendAt: new Date(Date.now() + delay)
  });
}

module.exports = {
  scheduleProactiveSellSSI
};
