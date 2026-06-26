// ======================================
// FO INTERNAL CHANNEL
// Separate internal communication channel for
// escalating trade issues to the Front Office.
// Now backed by MongoDB.
// ======================================

const foAI = require("./foAI");
const truthEngine = require("./truthEngine");
const FOCommunication = require("../models/FOCommunication");

// Pending FO internal replies
const pendingFOInternalReplies = [];
let isProcessingFOInternal = false;

/**
 * Open an internal FO channel for a trade.
 */
async function openChannel(tradeRef, userId, desk) {
  let channel = await FOCommunication.findOne({ tradeRef });
  if (!channel) {
    channel = new FOCommunication({
      tradeRef,
      openedBy: userId,
      desk,
      status: "OPEN",
      messages: []
    });
    await channel.save();
  }
  return channel;
}

/**
 * Send a message on the internal FO channel.
 */
async function sendMessage(tradeRef, sender, message, senderRole = "USER") {
  const channel = await FOCommunication.findOne({ tradeRef });
  if (!channel) return null;

  const msg = {
    sender,
    senderRole,
    message,
    timestamp: new Date()
  };

  channel.messages.push(msg);
  await channel.save();
  
  try {
    const { getIo } = require("./socketEngine");
    const io = getIo();
    if (io) io.emit("new_email", { tradeRef });
  } catch (err) {}

  return msg;
}

/**
 * Schedule an FO reply on the internal channel.
 * The FO AI will generate a response after a delay.
 * @param {string} tradeRef
 * @param {Object} trade - The trade object
 * @param {string} userMessage - What the user said
 * @param {string} escalationContext - "CONFIRMATION" or "MO"
 */
function scheduleFOInternalReply(tradeRef, trade, userMessage, escalationContext = "CONFIRMATION") {
  const delay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000; // 3-8 seconds

  pendingFOInternalReplies.push({
    tradeRef,
    trade,
    userMessage,
    escalationContext,
    sendAt: Date.now() + delay
  });
}

/**
 * Process pending FO internal replies.
 * Called on interval from server.js.
 */
async function processFOInternalReplies(saveTrade) {
  if (isProcessingFOInternal) return;

  const now = Date.now();

  const readyIndices = [];
  for (let i = 0; i < pendingFOInternalReplies.length; i++) {
    if (now >= pendingFOInternalReplies[i].sendAt) {
      readyIndices.push(i);
    }
  }

  if (readyIndices.length === 0) return;

  const randomIndex = readyIndices[Math.floor(Math.random() * readyIndices.length)];
  const reply = pendingFOInternalReplies.splice(randomIndex, 1)[0];

  isProcessingFOInternal = true;
  try {
    const trade = reply.trade;
    if (!trade) return;

    const foRound = trade.foContactCount || 1;
    const targetDeskTruth = foRound > 1 ? "universal" : "fo";
    const moMismatches = truthEngine.getMismatchFields(trade, targetDeskTruth);

    let foPosition;
    let foResponseText;

    if (moMismatches.length === 0) {
      // FO sees no issue with their local truth (Round 1) or Universal truth (Round 2)
      foPosition = "FO_SUPPORTS_US";
      foResponseText = generateFOSupportsUsResponse(trade, targetDeskTruth, reply.deskContext);
    } else {
      // FO sees an issue, they admit mistake and we should generate pending amendments
      foPosition = "FO_ADMITS_MISTAKE";
      foResponseText = generateFOSupportsCptyResponse(trade, moMismatches, targetDeskTruth, reply.deskContext);
    }

    // Send FO's response on the internal channel
    await sendMessage(reply.tradeRef, "FO_DESK", foResponseText, "FO");

    // Update trade's FO escalation status
    trade.foEscalation = trade.foEscalation || {};
    trade.foEscalation.status = foPosition;
    trade.foEscalation.resolvedAt = foPosition !== "FO_INVESTIGATING" ? new Date() : null;
    trade.foEscalation.foResponse = foResponseText;

    if (foPosition === "FO_ADMITS_MISTAKE") {
        const amendmentEngine = require("./amendmentEngine");
        const universalMismatches = truthEngine.getMismatchFields(trade, "universal");
        const targetTruth = trade.truths?.universal;
        if (universalMismatches.length > 0 && targetTruth) {
             universalMismatches.forEach(m => {
                 let field = typeof m === "string" ? m : m.field;
                 let correctValue = targetTruth[field];
                 const amendment = amendmentEngine.createAmendment(trade, field, correctValue, "MO", "FO_INTERNAL");
                 if (amendment) {
                     amendment.status = "ACCEPTED";
                     amendmentEngine.attachAmendments(trade, [amendment]);
                 }
             });
             
             // Auto apply
             if (trade.pendingAmendments) {
                 trade.pendingAmendments.forEach(a => a.status = "ACCEPTED");
             }
             amendmentEngine.applyAllAccepted(trade, "FO_SYSTEM");

             // Transition back to CONFIRMATION_PENDING since FO fixed it
             const LifecycleEngine = require("./lifecycle");
             try {
                 const tradeObj = trade.toObject ? trade.toObject() : trade;
                 const updatedTrade = LifecycleEngine.transition(tradeObj, "CONFIRMATION_PENDING");
                 trade.currentStatus = updatedTrade.currentStatus;
             } catch(e) {
                 console.warn("Could not transition trade:", e.message);
             }
        }
    }

    if (saveTrade) await saveTrade(trade);

    console.log("FO INTERNAL REPLY:", reply.tradeRef, "Position:", foPosition);
  } finally {
    isProcessingFOInternal = false;
  }
}

/**
 * Get the internal FO channel for a trade.
 */
async function getChannel(tradeRef) {
  return await FOCommunication.findOne({ tradeRef }).lean();
}

/**
 * Close the internal FO channel.
 */
async function closeChannel(tradeRef) {
  const channel = await FOCommunication.findOne({ tradeRef });
  if (channel) {
    channel.status = "CLOSED";
    channel.closedAt = new Date();
    await channel.save();
  }
}

// ======================================
// FO RESPONSE GENERATORS
// ======================================

function generateFOSupportsUsResponse(trade, truthType = "fo", deskContext = "CONFIRMATION") {
  const intro = truthType === "universal" ? "After re-checking our execution system and speaking with the trading desk directly (Universal Truth)," : "We've checked our records";
  let responses = [];
  if (deskContext === "MO") {
    responses = [
      `${intro} we can confirm that the booking is correct as per our trading system. The trade was executed at ${trade.currency} ${trade.amount} with value date ${new Date(trade.valueDate).toISOString().split("T")[0]}. Please proceed to validate.`,
      `FO confirms: our records match the current booking. No amendment required. You are good to pass validation.`,
      `After reviewing the trade ticket and execution log, we confirm our booking is accurate. You can proceed with the trade.`,
      `Verified against our execution system — the trade details are correct.`
    ];
  } else {
    responses = [
      `${intro} we can confirm that the booking is correct as per our trading system. The trade was executed at ${trade.currency} ${trade.amount} with value date ${new Date(trade.valueDate).toISOString().split("T")[0]}. The counterparty may be referencing outdated information. Please proceed with our figures.`,
      `${intro} FO confirms: our records match the current booking. No amendment required from our side. Please push back on the counterparty's claim.`,
      `After reviewing the trade ticket and execution log, we confirm our booking is accurate. The counterparty's claim appears to be based on a misunderstanding. You are good to proceed.`,
      `Verified against our execution system — the trade details are correct. Please reject the counterparty's dispute and reconfirm with our current values.`
    ];
  }
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateFOSupportsCptyResponse(trade, mismatches, truthType = "fo", deskContext = "CONFIRMATION") {
  const introMO = truthType === "universal" ? "We ran a deep dive using the universal exchange truth" : "We've reviewed the trade";
  const introCpty = truthType === "universal" ? "We ran a deep dive using the universal exchange truth" : "We've reviewed the trade";

  const mismatchDesc = mismatches.map(m => {
    let field = typeof m === "string" ? m : m.field;
    let targetTruth = trade.truths?.[truthType] || trade.truths?.mo;
    let cptyExpected = targetTruth ? targetTruth[field] : "correct value";
    
    if (field === "amount") return `correct amount should be ${trade.currency} ${cptyExpected}`;
    if (field === "valueDate") return `correct value date should be ${new Date(cptyExpected).toISOString().split("T")[0]}`;
    if (field === "currency") return `correct currency should be ${cptyExpected}`;
    return `${field} needs correction`;
  }).join(", ");

  let responses = [];
  if (deskContext === "MO") {
    responses = [
      `${introMO} and noticed an error in our booking. Our booking has an error — ${mismatchDesc}. Please raise an amendment to correct this.`,
      `FO acknowledges the discrepancy in our internal booking. ${mismatchDesc}. Please amend accordingly.`,
      `After checking our execution records, we can confirm there is a booking mistake. The ${mismatchDesc}. An amendment should be raised to correct it.`
    ];
  } else {
    responses = [
      `${introCpty} and the counterparty is correct. Our booking has an error — ${mismatchDesc}. Please raise an amendment to correct this.`,
      `FO acknowledges the discrepancy. The counterparty's figures are accurate: ${mismatchDesc}. Please amend accordingly and resend confirmation.`,
      `After checking our execution records, we can confirm the counterparty is right. The ${mismatchDesc}. An amendment should be raised to match their expectations.`
    ];
  }
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateFOInvestigatingResponse(trade, mismatches, deskContext = "CONFIRMATION") {
  let responses = [];
  if (deskContext === "MO") {
    responses = [
      `We're looking into this internal booking discrepancy. The issue is being escalated to the trading desk for review. We'll get back to you shortly with a resolution.`,
      `This booking discrepancy needs further investigation. We've flagged it with the trader who executed this deal. Please hold off on any amendments until we confirm.`,
      `We acknowledge the discrepancy but need to verify with our trading system. Investigation is underway — expect an update within the hour.`
    ];
  } else {
    responses = [
      `We're looking into this. The counterparty's claim is being escalated to the trading desk for review. We'll get back to you shortly with a resolution.`,
      `This needs further investigation. We've flagged the counterparty's dispute with the trader who executed this deal. Please hold off on any amendments until we confirm.`,
      `We acknowledge the counterparty's claim but need to verify with our trading system. Investigation is underway — expect an update within the hour.`
    ];
  }
  return responses[Math.floor(Math.random() * responses.length)];
}

module.exports = {
  openChannel,
  sendMessage,
  scheduleFOInternalReply,
  processFOInternalReplies,
  getChannel,
  closeChannel
};
