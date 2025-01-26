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

const rooms = {}; // Track rooms, masters, slaves, and active streams

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("master", ({ email, code }) => {
    if (email === "amarjeetsinghchauhan96@gmail.com") {
      rooms[code] = { master: socket.id, slaves: [], screenStream: null };
      socket.join(code);
      console.log(`Master joined room: ${code}`);
    }
  });

  socket.on("slave", ({ code }) => {
    if (rooms[code]) {
      rooms[code].slaves.push(socket.id);
      socket.join(code);

      // Notify the master about the updated slave count
      io.to(rooms[code].master).emit("updateSlaveCount", rooms[code].slaves.length);

      // If a screen stream is already active, send it to the new slave
      if (rooms[code].screenStream) {
        socket.emit("screenStream", { streamData: rooms[code].screenStream });
      }
    } else {
      socket.emit("invalidCode", { message: "Invalid room code." });
    }
  });

  socket.on("screenStream", ({ roomCode, streamData }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].screenStream = streamData; // Save the stream data
      socket.to(roomCode).emit("screenStream", { streamData }); // Broadcast to all slaves
    }
  });

  socket.on("stopScreen", ({ code }) => {
    if (rooms[code]) {
      rooms[code].screenStream = null; // Clear the active screen stream
      io.to(code).emit("stopScreen"); // Notify all slaves
    }
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];
      if (room.master === socket.id) {
        delete rooms[code]; // Delete the room if the master disconnects
        io.to(code).emit("roomClosed", { message: "The room has been closed." });
      } else {
        room.slaves = room.slaves.filter((id) => id !== socket.id);
        io.to(room.master).emit("updateSlaveCount", room.slaves.length);
      }
    });
    console.log("User disconnected:", socket.id);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
