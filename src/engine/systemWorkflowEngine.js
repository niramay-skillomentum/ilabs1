// ======================================
// SYSTEM WORKFLOW ENGINE
// Drives the automated amendment + verification/approval workflow on the
// Settlement Desk. Delayed processing follows the PendingReply idiom
// (DB-queued rows + a setInterval poller in server.js), but uses its own
// SystemJob queue and SystemMail store so it runs completely independently
// of the CPTY / FO communication channels.
//
//   SETTLEMENT_BREAK
//     → scheduleAmendment()      → PENDING_AMENDMENT
//     → processJobs(AMENDMENT)    → AMENDED  (+ "Trade Amended" system mail)
//     → scheduleVerification()   → PENDING_APPROVAL
//     → processJobs(VERIFICATION) → APPROVED           (+ "Trade Approved" mail)
//                                 | REJECTED_REVERIFY   (+ "Verification Failed" mail)
// ======================================

const Trade = require("../models/Trade");
const SystemJob = require("../models/SystemJob");
const SystemMail = require("../models/SystemMail");
const LifecycleEngine = require("./lifecycle");
const auditEngine = require("./auditEngine");

// Configurable delays (ms) to simulate backend processing time
const AMENDMENT_DELAY_MS = parseInt(process.env.SYSTEM_AMENDMENT_DELAY_MS, 10) || 8000;
const VERIFICATION_DELAY_MS = parseInt(process.env.SYSTEM_VERIFICATION_DELAY_MS, 10) || 8000;

// SSI fields the settlement desk verifies system-vs-truth
const SSI_FIELDS = [
  "beneficiaryName", "beneficiaryBank", "beneficiaryBIC",
  "accountNumber", "accountType", "currency",
  "settlementMethod", "correspondentBank", "paymentReference"
];

// Fields that must always be present for a settlement to be valid
const MANDATORY_FIELDS = [
  "beneficiaryName", "beneficiaryBank", "beneficiaryBIC",
  "accountNumber", "currency", "settlementMethod"
];

let isProcessing = false;

// ======================================
// HELPERS
// ======================================

function emit(event, userId, data) {
  try {
    const { getIo } = require("./socketEngine");
    const io = getIo();
    if (io) {
      if (userId) io.to(`user_${userId}`).emit(event, data);
      else io.emit(event, data);
    }
  } catch (err) { /* socket not ready — ignore */ }
}

function applyTransition(trade, toStatus) {
  const plain = trade.toObject ? trade.toObject() : trade;
  const updated = LifecycleEngine.transition(plain, toStatus);
  trade.currentStatus = updated.currentStatus;
}

// ======================================
// SCHEDULERS (called from settlement routes)
// ======================================

async function scheduleAmendment(trade, userId, desk, settlementType) {
  applyTransition(trade, "PENDING_AMENDMENT");
  trade.verificationErrors = [];
  await trade.save();

  await SystemJob.create({
    tradeRef: trade.tradeRef,
    jobType: "AMENDMENT",
    userId,
    desk: desk || "SETTLEMENT",
    settlementType: settlementType || trade.truths?.settlement?.settlementType,
    sendAt: new Date(Date.now() + AMENDMENT_DELAY_MS)
  });

  await auditEngine.recordEvent(
    trade.tradeRef, userId, "SETTLEMENT_AMENDMENT_REQUESTED",
    "SETTLEMENT_BREAK → PENDING_AMENDMENT | Sent to System for Amendment"
  );

  emit("trade_update", userId, { tradeRef: trade.tradeRef, currentStatus: trade.currentStatus });
  return trade;
}

async function scheduleVerification(trade, userId, desk) {
  applyTransition(trade, "PENDING_APPROVAL");
  trade.verificationErrors = [];
  await trade.save();

  await SystemJob.create({
    tradeRef: trade.tradeRef,
    jobType: "VERIFICATION",
    userId,
    desk: desk || "SETTLEMENT",
    sendAt: new Date(Date.now() + VERIFICATION_DELAY_MS)
  });

  await auditEngine.recordEvent(
    trade.tradeRef, userId, "SETTLEMENT_SENT_FOR_APPROVAL",
    "AMENDED → PENDING_APPROVAL | Sent for Approval (System Verification Bot)"
  );

  emit("trade_update", userId, { tradeRef: trade.tradeRef, currentStatus: trade.currentStatus });
  return trade;
}

// ======================================
// VALIDATION (System Verification Bot)
// ======================================

function validateTrade(trade) {
  const errors = [];
  const sys = trade.settlementDetails || {};
  const truth = trade.truths?.settlement || {};

  // 1. Trade-level economics
  if (!(trade.amount > 0)) errors.push("Trade amount is missing or invalid.");
  if (!trade.currency) errors.push("Trade currency is missing.");
  if (!trade.valueDate) errors.push("Trade value date is missing.");
  if (!trade.counterparty) errors.push("Counterparty is missing.");

  // 2. Counterparty consistency vs settlement truth
  if (truth.counterparty && trade.counterparty && truth.counterparty !== trade.counterparty) {
    errors.push(`Counterparty mismatch: booked "${trade.counterparty}", expected "${truth.counterparty}".`);
  }

  // 3. Mandatory settlement fields present
  for (const f of MANDATORY_FIELDS) {
    if (!sys[f]) errors.push(`Mandatory settlement field "${f}" is missing.`);
  }

  // 4. SSI details match the verified settlement instructions (truth)
  for (const f of SSI_FIELDS) {
    if (sys[f] !== truth[f]) {
      errors.push(`SSI detail "${f}" does not match verified instructions.`);
    }
  }

  return errors;
}

// ======================================
// AMENDMENT PROCESSOR
// Auto-corrects the settlement details to the verified (truth) values,
// records the changes in amendmentHistory, and drops a system mail.
// ======================================

async function processAmendment(job) {
  const trade = await Trade.findOne({ tradeRef: job.tradeRef });
  if (!trade || trade.currentStatus !== "PENDING_AMENDMENT") return;

  const sys = trade.settlementDetails || {};
  const truth = trade.truths?.settlement || {};

  const baseNumber = (trade.amendmentHistory || []).length;
  let seq = 0;
  const changed = [];

  for (const field of SSI_FIELDS) {
    if (sys[field] !== truth[field]) {
      changed.push({ field, oldValue: sys[field], newValue: truth[field] });
      sys[field] = truth[field];
      trade.amendmentHistory.push({
        amendmentNumber: baseNumber + (++seq),
        desk: "SETTLEMENT",
        field,
        oldValue: changed[changed.length - 1].oldValue,
        newValue: truth[field],
        source: "SYSTEM",
        status: "APPLIED",
        appliedAt: new Date(),
        appliedBy: "System"
      });
    }
  }

  trade.settlementDetails = sys;
  if (trade.markModified) {
    trade.markModified("settlementDetails");
    trade.markModified("amendmentHistory");
  }

  applyTransition(trade, "AMENDED");
  await trade.save();

  const changeLines = changed.length
    ? changed.map(c => `  • ${c.field}: "${c.oldValue ?? "—"}" → "${c.newValue ?? "—"}"`).join("\n")
    : "  • No field corrections were required.";

  const body =
    `Trade ${trade.tradeRef} has been amended successfully by the system.\n\n` +
    `The following settlement details were updated:\n${changeLines}\n\n` +
    `Status: AMENDED\nThe trade is now available for the approval workflow.`;

  await SystemMail.create({
    userId: job.userId,
    tradeRef: trade.tradeRef,
    from: "System",
    subject: `Trade Amended Successfully — ${trade.tradeRef}`,
    body,
    action: "AMENDED"
  });

  await auditEngine.recordEvent(
    trade.tradeRef, "System", "SETTLEMENT_AMENDED",
    `PENDING_AMENDMENT → AMENDED | System applied ${changed.length} correction(s)`,
    true
  );

  emit("trade_update", job.userId, { tradeRef: trade.tradeRef, currentStatus: "AMENDED" });
  emit("new_system_mail", job.userId, { tradeRef: trade.tradeRef, action: "AMENDED" });
}

// ======================================
// VERIFICATION PROCESSOR (System Verification Bot)
// ======================================

async function processVerification(job) {
  const trade = await Trade.findOne({ tradeRef: job.tradeRef });
  if (!trade || trade.currentStatus !== "PENDING_APPROVAL") return;

  const errors = validateTrade(trade);

  if (errors.length === 0) {
    applyTransition(trade, "APPROVED");
    trade.verificationErrors = [];
    await trade.save();

    await SystemMail.create({
      userId: job.userId,
      tradeRef: trade.tradeRef,
      from: "System",
      subject: `Trade Approved — ${trade.tradeRef}`,
      body:
        `Verification successful for trade ${trade.tradeRef}.\n\n` +
        `All settlement details, SSI, counterparty information and mandatory ` +
        `fields passed the automated verification checks.\n\n` +
        `Status: APPROVED\nThe trade is now eligible for settlement.`,
      action: "APPROVED"
    });

    await auditEngine.recordEvent(
      trade.tradeRef, "System", "SETTLEMENT_VERIFICATION_PASSED",
      "PENDING_APPROVAL → APPROVED | Automated verification passed",
      true
    );

    emit("trade_update", job.userId, { tradeRef: trade.tradeRef, currentStatus: "APPROVED" });
    emit("new_system_mail", job.userId, { tradeRef: trade.tradeRef, action: "APPROVED" });
  } else {
    applyTransition(trade, "REJECTED_REVERIFY");
    trade.verificationErrors = errors;
    if (trade.markModified) trade.markModified("verificationErrors");
    await trade.save();

    const reasons = errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n");
    await SystemMail.create({
      userId: job.userId,
      tradeRef: trade.tradeRef,
      from: "System",
      subject: `Verification Failed — ${trade.tradeRef}`,
      body:
        `Automated verification failed for trade ${trade.tradeRef}.\n\n` +
        `The following validation issues were found:\n${reasons}\n\n` +
        `Status: REJECTED_REVERIFY\nPlease review and correct the trade details, then resubmit for approval.`,
      action: "VERIFICATION_FAILED"
    });

    await auditEngine.recordEvent(
      trade.tradeRef, "System", "SETTLEMENT_VERIFICATION_FAILED",
      `PENDING_APPROVAL → REJECTED_REVERIFY | ${errors.length} issue(s): ${errors.join("; ")}`,
      true
    );

    emit("trade_update", job.userId, { tradeRef: trade.tradeRef, currentStatus: "REJECTED_REVERIFY" });
    emit("new_system_mail", job.userId, { tradeRef: trade.tradeRef, action: "VERIFICATION_FAILED" });
  }
}

// ======================================
// POLLER (invoked every few seconds from server.js)
// ======================================

async function processJobs() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const now = new Date();
    const dueJobs = await SystemJob.find({ sendAt: { $lte: now } }).sort({ sendAt: 1 }).lean();

    for (const job of dueJobs) {
      // Claim the job (delete first) so it is processed at most once
      const claimed = await SystemJob.findByIdAndDelete(job._id);
      if (!claimed) continue;

      try {
        if (job.jobType === "AMENDMENT") {
          await processAmendment(job);
        } else if (job.jobType === "VERIFICATION") {
          await processVerification(job);
        }
      } catch (err) {
        console.warn(`[SystemWorkflow] Job ${job.jobType} failed for ${job.tradeRef}:`, err.message);
      }
    }
  } catch (err) {
    console.warn("[SystemWorkflow] processJobs error:", err.message);
  } finally {
    isProcessing = false;
  }
}

module.exports = {
  scheduleAmendment,
  scheduleVerification,
  validateTrade,
  processJobs,
  SSI_FIELDS,
  MANDATORY_FIELDS
};
