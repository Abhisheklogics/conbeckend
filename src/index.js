import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();

app.use(cors({ origin: ["https://conexus-6asm.vercel.app"], credentials: true }));

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const activeScreenSharers = {}; // Track active master screen sharers
const rooms = {}; // Track users in rooms

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, peerId, email }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ socketId: socket.id, peerId, email });
    socket.join(roomId);

    if (!activeScreenSharers[roomId]) {
      activeScreenSharers[roomId] = peerId;
      io.to(roomId).emit("master-screen-sharing", { peerId });
    }

    socket.to(roomId).emit("user-connected", { peerId });
    socket.roomId = roomId;
    socket.peerId = peerId;
  });

  socket.on("screen-share-started", ({ roomId, peerId }) => {
    if (!activeScreenSharers[roomId]) {
      activeScreenSharers[roomId] = peerId;
      io.to(roomId).emit("master-screen-sharing", { peerId });
    } else {
      socket.emit("error-message", { message: "Screen sharing is already active!" });
    }
  });

  socket.on("screen-share-stopped", ({ roomId, peerId }) => {
    if (activeScreenSharers[roomId] === peerId) {
      delete activeScreenSharers[roomId];
      io.to(roomId).emit("master-screen-sharing", { peerId: null });
    }
  });

  socket.on("leave-room", ({ roomId, peerId }) => {
    rooms[roomId] = rooms[roomId]?.filter((user) => user.peerId !== peerId);
    if (activeScreenSharers[roomId] === peerId) delete activeScreenSharers[roomId];
    socket.leave(roomId);
    socket.to(roomId).emit("user-disconnected", { peerId });
  });

  socket.on("disconnect", () => {
    const { roomId, peerId } = socket;
    if (roomId && peerId) {
      rooms[roomId] = rooms[roomId]?.filter((user) => user.peerId !== peerId);
      if (activeScreenSharers[roomId] === peerId) delete activeScreenSharers[roomId];
      socket.to(roomId).emit("user-disconnected", { peerId });
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
