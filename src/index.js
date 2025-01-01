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

let users = []; // Keep track of connected users

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Add user to the list
  users.push(socket.id);

  // Notify all users about the new user
  socket.broadcast.emit("new-user", socket.id);

  // When a user starts screen sharing
  socket.on("start-screen-sharing", () => {
    console.log("Screen sharing started by", socket.id);

    // Broadcast screen-sharing start to all users
    io.emit("screen-sharing-started", { id: socket.id });
  });

  // When a user stops screen sharing
  socket.on("stop-screen-sharing", () => {
    console.log("Screen sharing stopped by", socket.id);

    // Broadcast screen-sharing stop to all users
    io.emit("stop-screen-sharing");
  });

  // Handle offer (screen sharing offer)
  socket.on("offer", (data) => {
    io.to(data.id).emit("offer", { id: socket.id, description: data.description });
  });

  // Handle answer (response to the offer)
  socket.on("answer", (data) => {
    io.to(data.id).emit("answer", { id: socket.id, description: data.description });
  });

  // Handle ICE candidates
  socket.on("ice-candidate", (data) => {
    io.to(data.id).emit("ice-candidate", { id: socket.id, candidate: data.candidate });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);

    // Remove user from the list
    users = users.filter((user) => user !== socket.id);

    // Notify other users that this user has disconnected
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
