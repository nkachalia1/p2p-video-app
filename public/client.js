const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static frontend files from public/
app.use(express.static("public"));

// In-memory map to track rooms and connected sockets
const rooms = new Map(); // roomName -> Set(socket.id)

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User tries to join a room
  socket.on("join-room", (roomName) => {
    let room = rooms.get(roomName);

    if (!room) {
      room = new Set();
      rooms.set(roomName, room);
    }

    // Max 2 users per room
    if (room.size >= 2) {
      socket.emit("room-full");
      return;
    }

    room.add(socket.id);
    socket.join(roomName);
    socket.roomName = roomName;

    // Inform the user they joined; first user becomes initiator
    socket.emit("joined-room", { isInitiator: room.size === 1 });

    // Notify existing peer a new user joined
    socket.to(roomName).emit("peer-joined");

    console.log(`User ${socket.id} joined room: ${roomName}`);
  });

  // Relay WebRTC signals (offer/answer/candidate)
  socket.on("signal", (data) => {
    if (socket.roomName) {
      socket.to(socket.roomName).emit("signal", data);
    }
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    const roomName = socket.roomName;
    if (!roomName) return;

    const room = rooms.get(roomName);
    if (!room) return;

    room.delete(socket.id);
    socket.to(roomName).emit("peer-left");

    // Clean up empty room
    if (room.size === 0) rooms.delete(roomName);

    console.log(`User disconnected: ${socket.id} from room: ${roomName}`);
  });
});

// Dynamic port for deployment platforms like Render/Heroku
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
