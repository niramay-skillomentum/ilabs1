const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

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
