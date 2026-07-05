const express = require("express");
const http = require("http");
const cors = require("cors");
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
const PORT = process.env.PORT || 3002;

// ======================================
// BACKGROUND PROCESSES (Fast Memory-Backed)
// Note: 1-minute cron-like tasks have been moved to Agenda
// ======================================

// On-demand single-trade fetch (indexed by unique tradeRef). Lean matches the
// old cache shape, so downstream processor mutation code is unchanged.
const getTradeByRef = (tradeRef) => Trade.findOne({ tradeRef }).lean();

// COMMUNICATION REPLY PROCESSORS
setInterval(() => {
  communicationEngine.processReplies(
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
  );
}, 3000);

// FO REPLY PROCESSOR
setInterval(() => {
  communicationEngine.processFOReplies(
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
  );
}, 3000);

// FO INTERNAL CHANNEL PROCESSOR
setInterval(() => {
  foInternalChannel.processFOInternalReplies(
    async (trade) => {
      await Trade.updateOne({ tradeRef: trade.tradeRef }, {
        $set: {
          foEscalation: trade.foEscalation,
          foResponseReceived: true,
          currentStatus: trade.currentStatus
        }
      });
    }
  );
}, 3000);

// SYSTEM WORKFLOW PROCESSOR (amendment + verification/approval bot)
setInterval(() => {
  systemWorkflowEngine.processJobs();
}, 3000);

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
app.use(cors());
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
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Simulation Clock Ready (starts on queue generation)");
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;