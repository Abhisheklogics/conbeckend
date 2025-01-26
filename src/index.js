import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware setup
app.use(
  cors({
    origin: ["https://conexus-6asm.vercel.app/"], // Tumhare frontend ka domain, update karo agar zarurat ho
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const server = createServer(app);
const io = new Server(server, { cors: true });

// In-memory room storage
const rooms = {};

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Master joins the room
  socket.on("master", ({ code }) => {
    if (!rooms[code]) {
      rooms[code] = { master: socket.id, slaves: [] };
      socket.join(code);
      console.log(`Master joined room: ${code}`);
    } else {
      socket.emit("roomExists", { message: "A master already exists for this room." });
    }
  });

  // Slave joins the room
  socket.on("slave", ({ code }) => {
    const room = rooms[code];
    if (room) {
      room.slaves.push(socket.id);
      socket.join(code);
      console.log(`Slave joined room: ${code}`);

      // Notify master of updated slave count
      io.to(room.master).emit("updateSlaveCount", room.slaves.length);

      // Notify the master that the slave is ready
      io.to(room.master).emit("slaveReady", { slaveId: socket.id });
    } else {
      socket.emit("invalidCode", { message: "Invalid room code." });
    }
  });

  // Master sends an offer to a slave
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  // Slave sends an answer to the master
  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  // Handle ICE candidates between peers
  socket.on("iceCandidate", ({ candidate, to }) => {
    io.to(to).emit("iceCandidate", { candidate, from: socket.id });
  });

  // Master stops screen sharing
  socket.on("stopScreen", ({ code }) => {
    const room = rooms[code];
    if (room && room.master === socket.id) {
      io.to(code).emit("stopScreen");
      console.log(`Screen sharing stopped in room: ${code}`);
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];

      if (room.master === socket.id) {
        // If master disconnects, close the room
        io.to(code).emit("roomClosed", { message: "The room has been closed by the master." });
        delete rooms[code];
        console.log(`Room closed: ${code}`);
      } else if (room.slaves.includes(socket.id)) {
        // If slave disconnects, remove them from the room
        room.slaves = room.slaves.filter((id) => id !== socket.id);
        io.to(room.master).emit("updateSlaveCount", room.slaves.length);
        console.log(`Slave disconnected from room: ${code}`);
      }
    });

    console.log("User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
