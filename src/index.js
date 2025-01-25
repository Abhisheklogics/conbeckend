import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: ["https://conexus-6asm.vercel.app/"], // Frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const server = createServer(app);
const io = new Server(server, { cors: { origin: ["https://conexus-6asm.vercel.app/"] } });

const rooms = {}; // { roomId: [{ socketId, email, peerId, role }] }
const activeScreenSharers = {}; // { roomId: { email, streamId } }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-room", ({ email }, callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = [{ socketId: socket.id, email, peerId: null, role: "master" }];
    socket.join(roomId);
    callback({ success: true, roomId });
    console.log(`Room ${roomId} created by ${email}`);
  });

  socket.on("join-room", ({ roomId, email, peerId }) => {
    if (!rooms[roomId]) {
      socket.emit("error-message", { message: "Room does not exist!" });
      return;
    }

    const role = rooms[roomId].length === 0 ? "master" : "slave";
    rooms[roomId].push({ socketId: socket.id, email, peerId, role });
    socket.join(roomId);

    if (activeScreenSharers[roomId]) {
      socket.emit("screen-share-update", { ...activeScreenSharers[roomId], isSharing: true });
    }

    io.to(roomId).emit("user-list-update", rooms[roomId]);
    console.log(`${email} joined room ${roomId}`);
  });

  socket.on("screen-share-started", ({ roomId, email, streamId }) => {
    const master = rooms[roomId]?.find((user) => user.role === "master");
    if (master && master.email === email) {
      activeScreenSharers[roomId] = { email, streamId };
      io.to(roomId).emit("screen-share-update", { email, streamId, isSharing: true });
      console.log(`Screen sharing started by ${email} in room ${roomId}`);
    }
  });

  socket.on("screen-share-stopped", ({ roomId, email }) => {
    if (activeScreenSharers[roomId]?.email === email) {
      delete activeScreenSharers[roomId];
      io.to(roomId).emit("screen-share-update", { email, isSharing: false });
      console.log(`Screen sharing stopped by ${email} in room ${roomId}`);
    }
  });

  socket.on("leave-room", ({ roomId }) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((user) => user.socketId !== socket.id);

      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        delete activeScreenSharers[roomId];
      }

      io.to(roomId).emit("user-list-update", rooms[roomId]);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const roomId in rooms) {
      const index = rooms[roomId].findIndex((user) => user.socketId === socket.id);
      if (index !== -1) {
        const [user] = rooms[roomId].splice(index, 1);

        if (user.role === "master") {
          delete activeScreenSharers[roomId];
        }

        io.to(roomId).emit("user-list-update", rooms[roomId]);
        break;
      }
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
