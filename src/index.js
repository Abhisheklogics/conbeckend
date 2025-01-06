import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

const io = new Server(server, {
  cors: true,
});

// In-memory rooms management
const rooms = {};

io.on("connection", (socket) => {
  socket.on("join room", (roomID) => {
    // Join the room or create a new one
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id); // Add socket to room
    } else {
      rooms[roomID] = [socket.id]; // Create a new room
    }

    console.log(`User ${socket.id} joined room ${roomID}`);

    // Notify the user of other users in the room
    socket.emit("all users", rooms[roomID]);

    // Notify others in the room that a new user has joined
    socket.to(roomID).emit("user joined", socket.id);
  });

  socket.on("offer", (payload) => {
    // Forward the offer to the target user
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    // Forward the answer to the target user
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("ice-candidate", (incoming) => {
    // Forward the ICE candidate to the target user
    io.to(incoming.target).emit("ice-candidate", incoming.candidate);
  });

  // Clean up the room when a user disconnects
  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);

    // Remove the user from all rooms
    for (let roomID in rooms) {
      const index = rooms[roomID].indexOf(socket.id);
      if (index !== -1) {
        rooms[roomID].splice(index, 1); // Remove socket from the room
        // Notify other users in the room that someone left
        socket.to(roomID).emit("user left", socket.id);

        // If the room is empty, delete it
        if (rooms[roomID].length === 0) {
          delete rooms[roomID];
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
