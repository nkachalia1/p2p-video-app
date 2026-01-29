const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("join-room", (roomName) => {
    let room = rooms.get(roomName);
    if (!room) {
      room = new Set();
      rooms.set(roomName, room);
    }

    if (room.size >= 2) {
      socket.emit("room-full");
      return;
    }

    room.add(socket.id);
    socket.join(roomName);
    socket.roomName = roomName;

    socket.emit("joined-room");
    socket.to(roomName).emit("peer-joined");
  });

  socket.on("signal", (data) => {
    socket.to(socket.roomName).emit("signal", data);
  });

  // 💬 CHAT RELAY
  socket.on("chat", (msg) => {
    socket.to(socket.roomName).emit("chat", msg);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(socket.roomName);
    if (!room) return;

    room.delete(socket.id);
    socket.to(socket.roomName).emit("peer-left");

    if (room.size === 0) rooms.delete(socket.roomName);
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
