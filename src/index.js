import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: true,
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Your frontend URL
    methods: ["GET", "POST"],
  })
);

let rooms = {}; // Store rooms and their statuses (first user, users in room)

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId, userId, callback) => {
    // Check if the room exists
    if (!rooms[roomId]) {
      rooms[roomId] = { users: [], isFirstUser: true }; // New room, first user
    }

    // Add user to the room
    rooms[roomId].users.push(userId);

    // Check if the user is the first one to join
    const isFirstUser = rooms[roomId].isFirstUser;
    if (isFirstUser) {
      rooms[roomId].isFirstUser = false; // After first user joins, others can share
    }

    // Join the socket to the room
    socket.join(roomId);

    // Notify the user if they are the first to join
    callback(isFirstUser);
  });

  // Handle starting a video call
  socket.on("start-video-call", (data) => {
    // Broadcast the user's video stream to all other users in the room
    socket.to(data.roomId).emit("receive-video-call", { stream: data.stream });
  });

  // Handle receiving a video call stream from another user
  socket.on("receive-video-call", (data) => {
    socket.to(data.roomId).emit("receive-video-call", { stream: data.stream });
  });

  // Handle screen sharing
  socket.on("start-screen-sharing", (data) => {
    // Broadcast screen share stream to all other users in the room
    socket.to(data.roomId).emit("sync-changes", { stream: data.stream });
  });

  // Handle syncing webpage changes (like text inputs or screen actions)
  socket.on("sync-changes", (data) => {
    socket.to(data.roomId).emit("sync-changes", data); // Sync changes across users
  });

  // Handle stopping screen sharing
  socket.on("stop-screen-sharing", (data) => {
    socket.to(data.roomId).emit("stop-screen-sharing");
  });

  // Handle disconnect event
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Clean up users and notify others if needed
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
