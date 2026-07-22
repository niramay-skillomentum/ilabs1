const aiParser = require("./aiParser");
const cptyAI = require("./cptyAI");
const amendmentEngine = require("./amendmentEngine");
const truthEngine = require("./truthEngine");
const foAI = require("./foAI");
const foResponseProfiles = require("./foResponseProfiles");
const LifecycleEngine = require("./lifecycle");
const PendingReply = require("../models/PendingReply");

// Batch cap so one tick can't monopolize the event loop while still draining
// the backlog far faster than the old one-per-tick ceiling.
const MAX_PER_TICK = 25;

/**
 * Atomically claim (and remove) the oldest due reply of a type.
 * findOneAndDelete is race-safe across multiple backend instances, so no
 * in-process latch is required and workers are horizontally scalable.
 */
async function claimNextReply(replyType) {
  return PendingReply.findOneAndDelete(
    { replyType, sendAt: { $lte: new Date() } },
    { sort: { sendAt: 1 } }
  ).lean();
}

/**
 * Emit a new_email notification scoped to the trade owner's socket room.
 * Falls back to a global broadcast only when the owner is unknown.
 */
function emitNewEmail(tradeRef, owner) {
  try {
    const { getIo } = require("./socketEngine");
    const io = getIo();
    if (!io) return;
    if (owner) io.to(`user_${owner}`).emit("new_email", { tradeRef });
    else io.emit("new_email", { tradeRef });
  } catch (err) {}
}

// ======================================
// CPTY REPLY QUEUE
// ======================================

async function scheduleReply(tradeRef, subject, body, desk) {

  // Randomize delay between 4 and 12 seconds for realism
  const delay = Math.floor(Math.random() * (12000 - 4000 + 1)) + 4000;

  await PendingReply.create({
    tradeRef,
    replyType: "CPTY_EMAIL",
    subject,
    body,
    desk,
    sendAt: new Date(Date.now() + delay)
  });

}

async function scheduleCPTYFinalReply(tradeRef, trade, cptyResponse) {
  const delay = cptyResponse.followUpDelayMs || 15000;
  console.log("CPTY SCHEDULING FINAL REPLY:", tradeRef, "Delay:", delay);
  await PendingReply.create({
    tradeRef,
    replyType: "CPTY_EMAIL",
    isFinalReply: true,
    payload: cptyResponse,
    sendAt: new Date(Date.now() + delay)
  });
}

async function processReplies(conversationEngine, getTradeByRef, saveTrade) {
  for (let i = 0; i < MAX_PER_TICK; i++) {
    let reply;
    try {
      reply = await claimNextReply("CPTY_EMAIL");
    } catch (err) {
      console.warn("CPTY claim error:", err.message);
      break; // DB unavailable — stop this tick, retry next interval
    }
    if (!reply) break; // drained
    try {
      await handleCptyReply(reply, conversationEngine, getTradeByRef, saveTrade);
    } catch (err) {
      console.warn("CPTY reply failed:", reply.tradeRef, err.message);
    }
  }
}

async function handleCptyReply(reply, conversationEngine, getTradeByRef, saveTrade) {
  const trade = await getTradeByRef(reply.tradeRef);

  if (reply.isFinalReply) {
    const cptyResponse = reply.payload;

    if (trade) {
      trade.cptyResponseReceived = true;
      const amendments = amendmentEngine.extractAmendments(cptyResponse.followUpBody, trade);
      amendmentEngine.attachAmendments(trade, amendments);
      if (saveTrade) await saveTrade(trade);
      // Emit after trade save so UI gets fresh cptyResponseReceived
      emitNewEmail(reply.tradeRef, trade.assignedTo);
    }

    let finalBody = cptyResponse.followUpBody;
    if (cptyResponse.hasAttachment) {
       finalBody += `\n\n<div style="margin-top:12px; padding:8px 12px; border:1px solid #c8c8c8; border-radius:4px; display:inline-block; background:#f3f2f1; cursor:pointer;">📎 <b>TradeTicket_${reply.tradeRef}.pdf</b><br><span style="font-size:11px;color:#605e5c;">1.2 MB</span></div>`;
    }

    conversationEngine.createMessage(
      reply.tradeRef,
      "COUNTERPARTY",
      finalBody,
      cptyResponse.followUpSubject || "RE: Trade Clarification",
      reply.desk, // use reply.desk to assign conversation to the correct desk
      true  // skipEmit
    );

  } else {

    const parsed = aiParser.parseEmail(reply.body);

    let aiResponse;
    if (reply.desk === "SETTLEMENT") {
      const cptySettlementAI = require("./cptySettlementAI");
      aiResponse = await cptySettlementAI.generateResponse(parsed, reply.tradeRef, reply.body);
    } else {
      aiResponse = await cptyAI.generateResponse(parsed, reply.tradeRef, reply.body);
    }

    if (aiResponse) {

      let body = aiResponse.body;
      if (aiResponse.hasAttachment) {
        body += `\n\n<div style="margin-top:12px; padding:8px 12px; border:1px solid #c8c8c8; border-radius:4px; display:inline-block; background:#f3f2f1; cursor:pointer;">📎 <b>TradeTicket_${reply.tradeRef}.pdf</b><br><span style="font-size:11px;color:#605e5c;">1.2 MB</span></div>`;
      }

      if (aiResponse.action === "HOLDING_MESSAGE") {
        conversationEngine.createMessage(
          reply.tradeRef,
          "COUNTERPARTY",
          body,
          aiResponse.subject,
          null, // desk
          true  // skipEmit
        );
        scheduleCPTYFinalReply(reply.tradeRef, trade, aiResponse);
      } else {

        if (trade) {
          trade.cptyResponseReceived = true;

          if (aiResponse.category === "CPTY_ADMITS_MISTAKE" && trade.truths?.universal) {
            trade.truths.confirmation = JSON.parse(JSON.stringify(trade.truths.universal));
            if (trade.markModified) trade.markModified('truths.confirmation');
          }

          const amendments = amendmentEngine.extractAmendments(aiResponse.body, trade);
          amendmentEngine.attachAmendments(trade, amendments);
          if (saveTrade) await saveTrade(trade);
          // Emit after trade save so UI gets fresh cptyResponseReceived
          emitNewEmail(reply.tradeRef, trade.assignedTo);
        }

        conversationEngine.createMessage(
          reply.tradeRef,
          "COUNTERPARTY",
          body,
          aiResponse.subject,
          null, // desk
          true  // skipEmit
        );
      }
    } else {
      // Retry LLM later
      await PendingReply.create({
        tradeRef: reply.tradeRef,
        replyType: "CPTY_EMAIL",
        subject: reply.subject,
        body: reply.body,
        sendAt: new Date(Date.now() + 5000)
      });
    }
  }
}

// ======================================
// FO REPLY QUEUE
// ======================================

async function scheduleFOFinalReply(tradeRef, trade, foResponse) {
  const delay = foResponse.followUpDelayMs || 15000;
  console.log("FO SCHEDULING FINAL REPLY:", tradeRef, "Delay:", delay);
  await PendingReply.create({
    tradeRef,
    replyType: "FO_EMAIL",
    isFinalReply: true,
    payload: foResponse,
    sendAt: new Date(Date.now() + delay)
  });
}

/**
 * Schedule an FO reply with delay based on counterparty profile
 */
async function scheduleFOReply(tradeRef, trade, userMessage) {

  const delay = foResponseProfiles.getDelay(trade.counterparty);

  console.log(
    "FO REPLY SCHEDULED:",
    tradeRef,
    "| Counterparty:", trade.counterparty,
    "| Delay:", delay + "ms"
  );

  await PendingReply.create({
    tradeRef,
    replyType: "FO_EMAIL",
    userMessage,
    sendAt: new Date(Date.now() + delay)
  });

}

/**
 * Process pending FO replies — called on interval from server.js
 */
async function processFOReplies(conversationEngine, getTradeByRef, saveTrade) {
  for (let i = 0; i < MAX_PER_TICK; i++) {
    let reply;
    try {
      reply = await claimNextReply("FO_EMAIL");
    } catch (err) {
      console.warn("FO claim error:", err.message);
      break; // DB unavailable — stop this tick, retry next interval
    }
    if (!reply) break; // drained
    try {
      await handleFoReply(reply, conversationEngine, getTradeByRef, saveTrade);
    } catch (err) {
      console.warn("FO reply failed:", reply.tradeRef, err.message);
    }
  }
}

async function handleFoReply(reply, conversationEngine, getTradeByRef, saveTrade) {
  const trade = await getTradeByRef(reply.tradeRef);
  if (!trade) return;

  if (reply.isFinalReply) {
    const foResponse = reply.payload;

    let finalBody = foResponse.followUpBody;
    if (foResponse.hasAttachment) {
       finalBody += `\n\n<div style="margin-top:12px; padding:8px 12px; border:1px solid #c8c8c8; border-radius:4px; display:inline-block; background:#f3f2f1; cursor:pointer;">📎 <b>FO_BookingData_${reply.tradeRef}.pdf</b><br><span style="font-size:11px;color:#605e5c;">3.4 MB</span></div>`;
    }

    conversationEngine.createMessage(
      reply.tradeRef,
      "FO",
      finalBody,
      foResponse.followUpSubject || "RE: Trade Clarification",
      null, // desk
      true  // skipEmit
    );

    trade.foResponseReceived = true;

    if (trade.truths?.mo && trade.booking) {
      const mismatches = truthEngine.getMismatchFields(trade, "mo");
      const amendmentsToAttach = [];
      for (const field of mismatches) {
        const amendment = amendmentEngine.createAmendmentFromInput(
          trade,
          field,
          trade.truths.mo[field]
        );
        if (amendment) amendmentsToAttach.push(amendment);
      }
      if (amendmentsToAttach.length > 0) {
        amendmentEngine.attachAmendments(trade, amendmentsToAttach);
      }
    }

    if (saveTrade) await saveTrade(trade);

    // Emit websocket AFTER trade is saved so UI gets fresh foResponseReceived
    emitNewEmail(reply.tradeRef, trade.assignedTo);

    console.log("FO FINAL REPLY SENT:", reply.tradeRef);

  } else {

    const foResponse = await foAI.generateFOResponse(trade, reply.userMessage);

    if (foResponse) {

      let body = foResponse.body;
      if (foResponse.hasAttachment) {
         body += `\n\n<div style="margin-top:12px; padding:8px 12px; border:1px solid #c8c8c8; border-radius:4px; display:inline-block; background:#f3f2f1; cursor:pointer;">📎 <b>FO_BookingData_${reply.tradeRef}.pdf</b><br><span style="font-size:11px;color:#605e5c;">3.4 MB</span></div>`;
      }

      conversationEngine.createMessage(
        reply.tradeRef,
        "FO",
        body,
        foResponse.subject,
        null, // desk
        true  // skipEmit
      );

      if (foResponse.action === "HOLDING_MESSAGE") {
         scheduleFOFinalReply(reply.tradeRef, trade, foResponse);
      } else {
         const cleanCategories = [
           "ERROR_CHECK_NO_ISSUES", "AMOUNT_CORRECT", "VALUE_DATE_CORRECT",
           "CURRENCY_CORRECT", "COUNTERPARTY_CORRECT", "CLEAN_TRADE"
         ];
         const breakCategories = [
           "ERROR_CHECK_WITH_ISSUES", "AMOUNT_MISMATCH", "VALUE_DATE_MISMATCH",
           "CURRENCY_MISMATCH", "COUNTERPARTY_MISMATCH"
         ];

         if (cleanCategories.includes(foResponse.category)) {
             trade.foResponseReceived = true;
             if (trade.currentStatus === "PENDING_FO_RESPONSE") {
                 trade.currentStatus = "MO_PENDING";
             } else if (trade.currentStatus === "LIASING_WITH_FO") {
                 // Keep state as LIASING_WITH_FO on first reply
                 if (trade.foEscalation) trade.foEscalation.status = "FO_SUPPORTS_US";
             }
         } else if (breakCategories.includes(foResponse.category)) {
             trade.foResponseReceived = true;
             if (trade.foEscalation) trade.foEscalation.status = "FO_SUPPORTS_CPTY";

             if (trade.currentStatus === "CONFIRMATION_BREAK") {
                 trade.currentStatus = "CONFIRMATION_PENDING";
             }
             // If LIASING_WITH_FO, keep the state
         }

         // Determine which truth to use for mismatches
         const isConfirmationDesk = trade.currentStatus === "CONFIRMATION_PENDING" || trade.currentStatus === "CONFIRMATION_BREAK" || trade.currentStatus === "LIASING_WITH_FO";
         const deskForMismatches = isConfirmationDesk ? "universal" : "mo";

         const truthData = truthEngine.getDeskTruth(trade, deskForMismatches);
         if (truthData && trade.booking) {
           const mismatches = truthEngine.getMismatchFields(trade, deskForMismatches);
           const amendmentsToAttach = [];
           for (const field of mismatches) {
             const amendment = amendmentEngine.createAmendment(
               trade,
               field,
               truthData[field],
               isConfirmationDesk ? "CONFIRMATION" : "MO",
               "FO"
             );
             if (amendment) {
               // If FO supports CPTY at Confirmation, FO auto-accepts
               if (isConfirmationDesk && breakCategories.includes(foResponse.category)) {
                 amendment.status = "ACCEPTED";
               }
               amendmentsToAttach.push(amendment);
             }
           }
           if (amendmentsToAttach.length > 0) {
             amendmentEngine.attachAmendments(trade, amendmentsToAttach);
             // Auto-apply if FO supports CPTY at Confirmation
             if (isConfirmationDesk && breakCategories.includes(foResponse.category)) {
               amendmentEngine.applyAllAccepted(trade, "SYSTEM_FO");
             }
           }
         }

         if (saveTrade) await saveTrade(trade);

         // Emit websocket AFTER trade is saved so UI gets fresh foResponseReceived
         emitNewEmail(reply.tradeRef, trade.assignedTo);

         console.log("FO REPLY SENT:", reply.tradeRef);
      }
    } else {
      // Retry LLM later
      await PendingReply.create({
        tradeRef: reply.tradeRef,
        replyType: "FO_EMAIL",
        userMessage: reply.userMessage,
        sendAt: new Date(Date.now() + 5000)
      });
    }
  }
}

module.exports = {
  scheduleReply,
  processReplies,
  scheduleFOReply,
  processFOReplies
};
