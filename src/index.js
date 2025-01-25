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
const io = new Server(server, { cors: true});

const rooms = {}; // Room details: { roomId: [{ socketId, email, role }] }
const activeScreenSharers = {}; // Active screen sharer: { roomId: { email, streamId } }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Create room
  socket.on("create-room", ({ email }, callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = [{ socketId: socket.id, email, role: "master" }];
    socket.join(roomId);
    callback({ success: true, roomId });
    console.log(`Room ${roomId} created by ${email}`);
  });

  // Join room
  socket.on("join-room", ({ roomId, email }) => {
    if (!rooms[roomId]) {
      socket.emit("error-message", { message: "Room does not exist!" });
      return;
    }

    rooms[roomId].push({ socketId: socket.id, email, role: "slave" });
    socket.join(roomId);

    // Notify newly joined user if screen sharing is active
    if (activeScreenSharers[roomId]) {
      socket.emit("screen-share-update", { ...activeScreenSharers[roomId], isSharing: true });
    }

    io.to(roomId).emit("user-list-update", rooms[roomId]);
    console.log(`${email} joined room ${roomId}`);
  });

  // Start screen sharing
  socket.on("screen-share-started", ({ roomId, email, streamId }) => {
    const master = rooms[roomId]?.find((user) => user.role === "master");
    if (master && master.email === email) {
      activeScreenSharers[roomId] = { email, streamId };
      io.to(roomId).emit("screen-share-update", { email, streamId, isSharing: true });
      console.log(`Screen sharing started by master (${email}) in room ${roomId}`);
    } else {
      socket.emit("error-message", { message: "Only the master can share the screen!" });
    }
  });

  // Stop screen sharing
  socket.on("screen-share-stopped", ({ roomId, email }) => {
    if (activeScreenSharers[roomId]?.email === email) {
      delete activeScreenSharers[roomId];
      io.to(roomId).emit("screen-share-update", { email, isSharing: false });
      console.log(`Screen sharing stopped by master (${email}) in room ${roomId}`);
    }
  });

  // Leave room
  socket.on("leave-room", ({ roomId, email }) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((user) => user.email !== email);

      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        delete activeScreenSharers[roomId];
      }

      io.to(roomId).emit("user-list-update", rooms[roomId]);
      console.log(`${email} left room ${roomId}`);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const roomId in rooms) {
      const userIndex = rooms[roomId].findIndex((user) => user.socketId === socket.id);

      if (userIndex !== -1) {
        const [disconnectedUser] = rooms[roomId].splice(userIndex, 1);

        if (disconnectedUser.role === "master") {
          delete activeScreenSharers[roomId];
          delete rooms[roomId];
        }

        io.to(roomId).emit("user-list-update", rooms[roomId]);
        break;
      }
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
