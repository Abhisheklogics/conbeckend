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

const rooms = {}; // Store rooms with the code

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Master joins the room
  socket.on("master", (data) => {
    const { email, code } = data;

    if (email === "amarjeetsinghchauhan96@gmail.com") {
      rooms[code] = { master: socket.id, slaves: [] };
      socket.emit("roomCode", { code });
    }
  });

  // Slave joins the room
  socket.on("slave", (data) => {
    const { code } = data;

    if (rooms[code]) {
      rooms[code].slaves.push(socket.id);
      socket.emit("validCode", { code });

      io.to(rooms[code].master).emit("updateSlaveCount", rooms[code].slaves.length);
    } else {
      socket.emit("invalidCode", { message: "Invalid room code." });
    }
  });

  // Relay screen stream data to all slaves in the room
  socket.on("screenStream", (data) => {
    const { roomCode, streamData } = data;

    const slaves = rooms[roomCode]?.slaves;
    if (slaves && slaves.length > 0) {
      slaves.forEach((slaveId) => {
        io.to(slaveId).emit("screenStream", { streamData });
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      rooms[code].slaves = rooms[code].slaves.filter((id) => id !== socket.id);
      if (rooms[code].master === socket.id) {
        delete rooms[code];
      }

      if (rooms[code].master) {
        io.to(rooms[code].master).emit("updateSlaveCount", rooms[code].slaves.length);
      }
    });
    console.log("User disconnected:", socket.id);
  });
});


server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
