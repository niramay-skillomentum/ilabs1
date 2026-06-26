const express = require("express");
const http = require("http");
require("dotenv").config();

const { connectDB, getIsConnected } = require("./src/db");
const Trade = require("./src/models/Trade");
const queueComposer = require("./src/engine/queueComposer");
const dailyScheduler = require("./src/engine/dailyScheduler");
const communicationEngine = require("./src/engine/communicationEngine");
const conversationEngine = require("./src/engine/conversationEngine");
const foInternalChannel = require("./src/engine/foInternalChannel");
const { startAgenda } = require("./src/engine/agendaJobs");
const { initSocket } = require("./src/engine/socketEngine");

const app = express();
const PORT = process.env.PORT || 3002;

// ======================================
// BACKGROUND PROCESSES (Fast Memory-Backed)
// Note: 1-minute cron-like tasks have been moved to Agenda
// ======================================

// COMMUNICATION REPLY PROCESSORS
setInterval(() => {
  communicationEngine.processReplies(
    conversationEngine,
    (tradeRef) => {
      return communicationEngine._cachedTrades?.[tradeRef] || null;
    },
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
    (tradeRef) => {
      return communicationEngine._cachedTrades?.[tradeRef] || null;
    },
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
          currentStatus: trade.foEscalation?.status === "FO_INVESTIGATING" ? trade.currentStatus : "CONFIRMATION_BREAK"
        }
      });
    }
  );
}, 3000);

// Cache refresh: periodically load assigned trades
setInterval(async () => {
  try {
    const assignedTrades = await Trade.find({ assignedTo: { $ne: null } }).lean();
    if (!communicationEngine._cachedTrades) {
      communicationEngine._cachedTrades = {};
    }
    communicationEngine._cachedTrades = {};
    assignedTrades.forEach(t => {
      communicationEngine._cachedTrades[t.tradeRef] = t;
    });
  } catch (err) {
    // Silent
  }
}, 2000);

// ======================================
// EXPRESS CONFIG & ROUTES
// ======================================
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