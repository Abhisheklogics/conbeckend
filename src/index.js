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

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.broadcast.emit("new-user", socket.id);

  // Handle offer
  socket.on("offer", (data) => {
    io.to(data.id).emit("offer", { id: socket.id, description: data.description });
  });

  // Handle answer
  socket.on("answer", (data) => {
    io.to(data.id).emit("answer", { id: socket.id, description: data.description });
  });

  // Handle ice candidates
  socket.on("ice-candidate", (data) => {
    io.to(data.id).emit("ice-candidate", { id: socket.id, candidate: data.candidate });
  });

  // Handle screen sharing events
  socket.on("start-screen-sharing", () => {
    console.log("Screen sharing started by", socket.id);
    socket.broadcast.emit("screen-sharing-started", { id: socket.id });
  });

  socket.on("stop-screen-sharing", () => {
    console.log("Screen sharing stopped by", socket.id);
    socket.broadcast.emit("stop-screen-sharing");
  });

  // Handle hang-up (call end)
  socket.on("hang-up", () => {
    console.log("Call ended by", socket.id);
    socket.broadcast.emit("user-disconnected", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
