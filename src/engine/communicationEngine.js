const aiParser = require("./aiParser");
const cptyAI = require("./cptyAI");
const amendmentEngine = require("./amendmentEngine");
const truthEngine = require("./truthEngine");
const foAI = require("./foAI");
const foResponseProfiles = require("./foResponseProfiles");
const LifecycleEngine = require("./lifecycle");

// ======================================
// CPTY REPLY QUEUE (existing — unchanged)
// ======================================

const pendingReplies = [];
let isProcessingCPTY = false;

function scheduleReply(tradeRef, subject, body) {

  // Randomize delay between 4 and 12 seconds for realism
  const delay = Math.floor(Math.random() * (12000 - 4000 + 1)) + 4000;

  pendingReplies.push({
    tradeRef,
    subject,
    body,
    sendAt: Date.now() + delay
  });

}

function scheduleCPTYFinalReply(tradeRef, trade, cptyResponse) {
  const delay = cptyResponse.followUpDelayMs || 15000;
  console.log("CPTY SCHEDULING FINAL REPLY:", tradeRef, "Delay:", delay);
  pendingReplies.push({
    tradeRef,
    isFinalReply: true,
    cptyResponse,
    sendAt: Date.now() + delay
  });
}

async function processReplies(conversationEngine, getTradeByRef, saveTrade) {
  if (isProcessingCPTY) return;

  const now = Date.now();

  const readyIndices = [];
  for (let i = 0; i < pendingReplies.length; i++) {
    if (now >= pendingReplies[i].sendAt) {
      readyIndices.push(i);
    }
  }

  if (readyIndices.length === 0) return;

  const randomIndex = readyIndices[Math.floor(Math.random() * readyIndices.length)];
  const reply = pendingReplies.splice(randomIndex, 1)[0];

  isProcessingCPTY = true;
  try {
    const trade = getTradeByRef(reply.tradeRef);

    if (reply.isFinalReply) {
      
      if (trade) {
        trade.cptyResponseReceived = true;
        const amendments = amendmentEngine.extractAmendments(reply.cptyResponse.followUpBody, trade);
        amendmentEngine.attachAmendments(trade, amendments);
        if (saveTrade) await saveTrade(trade);
        // Emit after trade save so UI gets fresh cptyResponseReceived
        try {
          const { getIo } = require("./socketEngine");
          const io = getIo();
          if (io) io.emit("new_email", { tradeRef: reply.tradeRef });
        } catch (err) {}
      }

      let finalBody = reply.cptyResponse.followUpBody;
      if (reply.cptyResponse.hasAttachment) {
         finalBody += `\n\n<div style="margin-top:12px; padding:8px 12px; border:1px solid #c8c8c8; border-radius:4px; display:inline-block; background:#f3f2f1; cursor:pointer;">📎 <b>TradeTicket_${reply.tradeRef}.pdf</b><br><span style="font-size:11px;color:#605e5c;">1.2 MB</span></div>`;
      }

      conversationEngine.createMessage(
        reply.tradeRef,
        "COUNTERPARTY",
        finalBody,
        reply.cptyResponse.followUpSubject || "RE: Trade Clarification"
      );

    } else {

      const parsed = aiParser.parseEmail(reply.body);
      const aiResponse = await cptyAI.generateResponse(parsed, reply.tradeRef, reply.body);

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
            aiResponse.subject
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
            try {
              const { getIo } = require("./socketEngine");
              const io = getIo();
              if (io) io.emit("new_email", { tradeRef: reply.tradeRef });
            } catch (err) {}
          }

          conversationEngine.createMessage(
            reply.tradeRef,
            "COUNTERPARTY",
            body,
            aiResponse.subject
          );
        }
      } else {
        // Retry LLM later
        reply.sendAt = Date.now() + 5000;
        pendingReplies.push(reply);
      }
    }
  } finally {
    isProcessingCPTY = false;
  }
}

// ======================================
// FO REPLY QUEUE (new)
// ======================================

const pendingFOReplies = [];
let isProcessingFO = false;

function scheduleFOFinalReply(tradeRef, trade, foResponse) {
  const delay = foResponse.followUpDelayMs || 15000;
  console.log("FO SCHEDULING FINAL REPLY:", tradeRef, "Delay:", delay);
  pendingFOReplies.push({
    tradeRef,
    trade,
    isFinalReply: true,
    foResponse,
    sendAt: Date.now() + delay
  });
}

/**
 * Schedule an FO reply with delay based on counterparty profile
 */
function scheduleFOReply(tradeRef, trade, userMessage) {

  const delay = foResponseProfiles.getDelay(trade.counterparty);

  console.log(
    "FO REPLY SCHEDULED:",
    tradeRef,
    "| Counterparty:", trade.counterparty,
    "| Delay:", delay + "ms"
  );

  pendingFOReplies.push({
    tradeRef,
    trade,
    userMessage,
    sendAt: Date.now() + delay
  });

}

/**
 * Process pending FO replies — called on interval from server.js
 */
async function processFOReplies(conversationEngine, getTradeByRef, saveTrade) {
  if (isProcessingFO) return;

  const now = Date.now();

  const readyIndices = [];
  for (let i = 0; i < pendingFOReplies.length; i++) {
    if (now >= pendingFOReplies[i].sendAt) {
      readyIndices.push(i);
    }
  }

  if (readyIndices.length === 0) return;

  const randomIndex = readyIndices[Math.floor(Math.random() * readyIndices.length)];
  const reply = pendingFOReplies.splice(randomIndex, 1)[0];

  isProcessingFO = true;
  try {
    const trade = getTradeByRef(reply.tradeRef);

    if (trade) {

      if (reply.isFinalReply) {
        
        let finalBody = reply.foResponse.followUpBody;
        if (reply.foResponse.hasAttachment) {
           finalBody += `\n\n<div style="margin-top:12px; padding:8px 12px; border:1px solid #c8c8c8; border-radius:4px; display:inline-block; background:#f3f2f1; cursor:pointer;">📎 <b>FO_BookingData_${reply.tradeRef}.pdf</b><br><span style="font-size:11px;color:#605e5c;">3.4 MB</span></div>`;
        }

        conversationEngine.createMessage(
          reply.tradeRef,
          "FO",
          finalBody,
          reply.foResponse.followUpSubject || "RE: Trade Clarification"
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
        try {
          const { getIo } = require("./socketEngine");
          const io = getIo();
          if (io) io.emit("new_email", { tradeRef: reply.tradeRef });
        } catch (err) {}

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
            foResponse.subject
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
                 }
             } else if (breakCategories.includes(foResponse.category)) {
                 trade.foResponseReceived = true;
             }

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
             try {
               const { getIo } = require("./socketEngine");
               const io = getIo();
               if (io) io.emit("new_email", { tradeRef: reply.tradeRef });
             } catch (err) {}

             console.log("FO REPLY SENT:", reply.tradeRef);
          }
        } else {
          // Retry LLM later
          reply.sendAt = Date.now() + 5000;
          pendingFOReplies.push(reply);
        }
      }
    }
  } finally {
    isProcessingFO = false;
  }
}

module.exports = {
  scheduleReply,
  processReplies,
  scheduleFOReply,
  processFOReplies
};