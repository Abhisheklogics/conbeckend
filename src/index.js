import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: ["https://conexus-6asm.vercel.app/"], // Update as needed
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const server = createServer(app);
const io = new Server(server, { cors: true });

const rooms = {}; // Store information about rooms and peer connections

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle master or slave joining a room
  socket.on("master", ({ code }) => {
    if (!rooms[code]) {
      rooms[code] = { master: socket.id, slaves: [] };
      socket.join(code);
      console.log(`Master joined room: ${code}`);
    } else {
      socket.emit("roomExists", { message: "A master already exists for this room." });
    }
  });

  socket.on("slave", ({ code }) => {
    const room = rooms[code];
    if (room) {
      room.slaves.push(socket.id);
      socket.join(code);
      console.log(`Slave joined room: ${code}`);
      io.to(room.master).emit("updateSlaveCount", room.slaves.length);

      // Notify the master that a new slave is ready
      io.to(room.master).emit("slaveReady", { slaveId: socket.id });
    } else {
      socket.emit("invalidCode", { message: "Invalid room code." });
    }
  });

  // Handle master sending an offer to a slave
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  // Handle slave sending an answer to the master
  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  // Handle ICE candidates between peers
  socket.on("iceCandidate", ({ candidate, to }) => {
    io.to(to).emit("iceCandidate", { candidate, from: socket.id });
  });

  // Handle stopping the screen stream
  socket.on("stopScreen", ({ code }) => {
    const room = rooms[code];
    if (room && room.master === socket.id) {
      io.to(code).emit("stopScreen");
      console.log(`Screen sharing stopped in room: ${code}`);
    }
  });

  // Handle disconnection of master or slave
  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];

      if (room.master === socket.id) {
        // Remove the room if the master disconnects
        io.to(code).emit("roomClosed", { message: "The room has been closed by the master." });
        delete rooms[code];
      } else if (room.slaves.includes(socket.id)) {
        // Remove the slave if it disconnects
        room.slaves = room.slaves.filter((id) => id !== socket.id);
        io.to(room.master).emit("updateSlaveCount", room.slaves.length);
      }
    });
    console.log("User disconnected:", socket.id);
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
