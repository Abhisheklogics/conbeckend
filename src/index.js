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

const rooms = {}; // Structure: { roomCode: { master: socketId, slaves: [] } }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Master joins
  socket.on("master", ({ email, code }) => {
    if (email === "amarjeetsinghchauhan96@gmail.com") {
      rooms[code] = { master: socket.id, slaves: [] };
      socket.join(code); // Join master to the room
      socket.emit("roomCreated", { code });
    }
  });

  // Slave joins
  socket.on("slave", ({ code }) => {
    if (rooms[code]) {
      rooms[code].slaves.push(socket.id);
      socket.join(code); // Join slave to the room
      io.to(code).emit("updateSlaveCount", rooms[code].slaves.length); // Notify master of updated count
    } else {
      socket.emit("invalidCode", { message: "Invalid room code." });
    }
  });

  // Master shares screen stream
  socket.on("screenStream", ({ roomCode, streamData }) => {
    io.to(roomCode).emit("screenStream", { streamData }); // Broadcast to all slaves
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      // Remove disconnected user from the room
      rooms[code].slaves = rooms[code].slaves.filter((id) => id !== socket.id);

      // If master disconnects, delete the room
      if (rooms[code].master === socket.id) {
        delete rooms[code];
      } else {
        io.to(code).emit("updateSlaveCount", rooms[code].slaves.length);
      }
    });
    console.log("User disconnected:", socket.id);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
