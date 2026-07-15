const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");

let io;

// ======================================
// CORS — restrict to known origins.
// Set ALLOWED_ORIGINS env var (comma-separated) in production.
// Defaults to the dev frontend origin.
// ======================================
function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw) {
    return raw.split(",").map(o => o.trim()).filter(Boolean);
  }
  return ["http://localhost:3000", "https://ilabs-skillomentum.vercel.app"];
}

async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true
    },
    // Blotter payloads are small; skip per-message deflate CPU cost.
    perMessageDeflate: false
  });

  // ======================================
  // HORIZONTAL SCALING — Redis adapter.
  // Without an adapter, Socket.io rooms are process-local: an emit on one
  // instance never reaches a socket connected to another instance. With
  // REDIS_URL set, rooms span every instance so `io.to('user_x').emit(...)`
  // works no matter which instance the user (or the emitting worker) is on.
  // Guarded + lazy-required so the app still boots with no Redis in dev.
  // ======================================
  if (process.env.REDIS_URL) {
    try {
      const { createAdapter } = require("@socket.io/redis-adapter");
      const { createClient } = require("redis");
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      pubClient.on("error", (e) => console.warn("[Redis pub] ", e.message));
      subClient.on("error", (e) => console.warn("[Redis sub] ", e.message));
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.io Redis adapter attached — rooms now span all instances");
    } catch (err) {
      console.warn("⚠️ Redis adapter failed to attach — running single-instance socket mode:", err.message);
    }
  }

  // Authentication Middleware for Sockets
  io.use((socket, next) => {
    try {
      // Sockets might send auth_token via headers/cookie or auth payload
      let token = socket.handshake.auth?.token;
      
      if (!token && socket.handshake.headers.cookie) {
        const cookies = cookie.parse(socket.handshake.headers.cookie);
        token = cookies["auth_token"];
      }

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded; // { userId, fullName }
      
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.userId;
    console.log(`🔌 [Socket.io] User connected: ${userId} (Socket ID: ${socket.id})`);

    // Join a room specifically for this user's email to target direct notifications
    socket.join(`user_${userId}`);

    // Allow user to join specific desk rooms dynamically
    socket.on("join_desk", (desk) => {
      socket.join(`desk_${desk}`);
      console.log(`🔌 [Socket.io] ${userId} joined room: desk_${desk}`);
    });

    socket.on("leave_desk", (desk) => {
      socket.leave(`desk_${desk}`);
      console.log(`🔌 [Socket.io] ${userId} left room: desk_${desk}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 [Socket.io] User disconnected: ${userId}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

module.exports = {
  initSocket,
  getIo
};
