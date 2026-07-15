const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
require("dotenv").config();

const { connectDB, getIsConnected } = require("./src/db");
const Trade = require("./src/models/Trade");
const queueComposer = require("./src/engine/queueComposer");
const dailyScheduler = require("./src/engine/dailyScheduler");
const communicationEngine = require("./src/engine/communicationEngine");
const conversationEngine = require("./src/engine/conversationEngine");
const foInternalChannel = require("./src/engine/foInternalChannel");
const systemWorkflowEngine = require("./src/engine/systemWorkflowEngine");
const { startAgenda } = require("./src/engine/agendaJobs");
const { initSocket } = require("./src/engine/socketEngine");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3002;

// ======================================
// BACKGROUND PROCESSES (Fast Memory-Backed)
// Note: 1-minute cron-like tasks have been moved to Agenda
// ======================================

// On-demand single-trade fetch (indexed by unique tradeRef). Lean matches the
// old cache shape, so downstream processor mutation code is unchanged.
const getTradeByRef = (tradeRef) => Trade.findOne({ tradeRef }).lean();

// guardedInterval: run `fn` every `ms`, but never let a slow tick overlap the
// next one. Reply processors await up to 25 LLM calls per tick; without this
// guard, slow ticks stack up and exhaust the DB connection pool.
function guardedInterval(name, fn, ms) {
  let busy = false;
  return setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } catch (err) {
      console.warn(`[Background:${name}] tick error:`, err.message);
    } finally {
      busy = false;
    }
  }, ms);
}

// ======================================
// ROLE GATING — the pollers are stateful queue drainers and must run in
// exactly ONE process, not on every web replica (that multiplies DB load by
// the replica count). Set ROLE=web on web instances and run a single ROLE=worker
// process. Default (unset) runs them, preserving today's single-process setup.
// The claim pattern (findOneAndDelete) keeps this correct even if misconfigured.
// ======================================
function startBackgroundProcessors() {
  const POLL_MS = parseInt(process.env.POLL_INTERVAL_MS, 10) || 3000;

  // COMMUNICATION REPLY PROCESSOR (CPTY)
  guardedInterval("cpty-replies", () => communicationEngine.processReplies(
    conversationEngine,
    getTradeByRef,
    async (trade) => {
      await Trade.updateOne({ tradeRef: trade.tradeRef }, {
        $set: {
          cptyResponseReceived: trade.cptyResponseReceived,
          pendingAmendments: trade.pendingAmendments
        }
      });
    }
  ), POLL_MS);

  // FO REPLY PROCESSOR
  guardedInterval("fo-replies", () => communicationEngine.processFOReplies(
    conversationEngine,
    getTradeByRef,
    async (trade) => {
      await Trade.updateOne({ tradeRef: trade.tradeRef }, {
        $set: {
          foResponseReceived: trade.foResponseReceived,
          currentStatus: trade.currentStatus,
          pendingAmendments: trade.pendingAmendments
        }
      });
    }
  ), POLL_MS);

  // FO INTERNAL CHANNEL PROCESSOR
  guardedInterval("fo-internal", () => foInternalChannel.processFOInternalReplies(
    async (trade) => {
      await Trade.updateOne({ tradeRef: trade.tradeRef }, {
        $set: {
          foEscalation: trade.foEscalation,
          foResponseReceived: true,
          currentStatus: trade.currentStatus
        }
      });
    }
  ), POLL_MS);

  // SYSTEM WORKFLOW PROCESSOR (amendment + verification/approval bot)
  guardedInterval("system-workflow", () => systemWorkflowEngine.processJobs(), POLL_MS);

  console.log(`⚙️  Background processors started (role=${process.env.ROLE || "all"}, interval=${POLL_MS}ms)`);
}

// (B1) The fleet-wide 2s cache refresh was removed — processors now fetch the
// single trade they need on demand via getTradeByRef (indexed findOne).

// ======================================
// STARTUP VALIDATION
// ======================================
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Server cannot start.");
  console.error("Set JWT_SECRET in your .env file with a strong random string.");
  process.exit(1);
}

// ======================================
// EXPRESS CONFIG & ROUTES
// ======================================
// Restrict REST CORS to the same allow-list the socket layer uses, instead of
// reflecting any origin. Set ALLOWED_ORIGINS (comma-separated) in production.
function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw) return raw.split(",").map(o => o.trim()).filter(Boolean);
  return ["http://localhost:3000", "https://ilabs-skillomentum.vercel.app"];
}
app.use(cors({ origin: getAllowedOrigins(), credentials: true }));

// gzip responses — trade/queue JSON payloads compress well (big bandwidth win).
app.use(compression());

app.use(express.json());

app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/session", require("./src/routes/sessionRoutes"));
app.use("/api/clock", require("./src/routes/clockRoutes"));
app.use("/api/queue", require("./src/routes/queueRoutes"));
app.use("/api/trade", require("./src/routes/tradeRoutes"));
app.use("/api/conversation", require("./src/routes/conversationRoutes"));
app.use("/api/conversations", require("./src/routes/conversationRoutes"));
app.use("/api/fo-channel", require("./src/routes/foChannelRoutes"));
app.use("/api/audit", require("./src/routes/auditRoutes"));
app.use("/api/settlement", require("./src/routes/settlementRoutes"));
app.use("/api/electronic-settlement", require("./src/routes/electronicSettlementRoutes"));
app.use("/api/system-mailbox", require("./src/routes/systemMailboxRoutes"));
app.use("/api/ssi", require("./src/routes/ssiRoutes"));
app.use("/api/chat", require("./src/routes/chatRoutes"));

// ======================================
// EXPORTS & SERVER START
// ======================================
async function startServer() {
  await connectDB();
  await startAgenda();

  const server = http.createServer(app);
  await initSocket(server);

  // Only web-facing replicas should skip the pollers. Any other role (worker,
  // or unset for single-process deploys) runs the background queue drainers.
  if (process.env.ROLE !== "web") {
    startBackgroundProcessors();
  } else {
    console.log("⚙️  ROLE=web — background processors NOT started on this instance");
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Simulation Clock Ready (starts on queue generation)");
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;