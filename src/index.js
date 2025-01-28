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

const activeScreenSharers = {}; // Tracks the active screen sharer in each room
const rooms = {}; // Tracks users in each room

io.on("connection", (socket) => {
  // Handle user joining a room
  socket.on("join-room", ({ roomId, peerId, email }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ socketId: socket.id, peerId, email });

    socket.join(roomId);
    socket.roomId = roomId;
    socket.peerId = peerId;

    console.log(`User joined: Room ${roomId}, Peer ID: ${peerId}, Email: ${email}`);

    // Notify the new user about the current master
    if (activeScreenSharers[roomId]) {
      const masterPeerId = activeScreenSharers[roomId];
      socket.emit("master-connected", { masterPeerId });
    }

    // Notify the room about the new user (except the master)
    if (peerId !== activeScreenSharers[roomId]) {
      socket.to(roomId).emit("user-connected", { peerId });
    }

    // Assign master screen sharer if no one is sharing
    if (!activeScreenSharers[roomId]) {
      activeScreenSharers[roomId] = peerId;
      io.to(roomId).emit("master-screen-sharing", { peerId });
    }
  });

  // Handle screen sharing start
  socket.on("screen-share-started", ({ roomId, peerId }) => {
    if (!activeScreenSharers[roomId]) {
      activeScreenSharers[roomId] = peerId;
      io.to(roomId).emit("master-screen-sharing", { peerId });
    } else {
      socket.emit("error-message", { message: "Another user is already sharing their screen!" });
    }
  });

  // Handle screen sharing stop
  socket.on("screen-share-stopped", ({ roomId, peerId }) => {
    if (activeScreenSharers[roomId] === peerId) {
      delete activeScreenSharers[roomId];
      io.to(roomId).emit("master-screen-sharing", { peerId: null });
    }
  });

  // Handle user leaving a room
  socket.on("leave-room", ({ roomId, peerId }) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((user) => user.peerId !== peerId);
      console.log(`User left: Room ${roomId}, Peer ID: ${peerId}`);
    }

    // Remove active screen sharer if the user was sharing
    if (activeScreenSharers[roomId] === peerId) {
      delete activeScreenSharers[roomId];
      io.to(roomId).emit("master-screen-sharing", { peerId: null });
    }

    socket.leave(roomId);
    socket.to(roomId).emit("user-disconnected", { peerId });

    // Assign a new master if the room still has users
    if (!activeScreenSharers[roomId] && rooms[roomId]?.length > 0) {
      const newMaster = rooms[roomId][0]?.peerId;
      activeScreenSharers[roomId] = newMaster;
      io.to(roomId).emit("master-screen-sharing", { peerId: newMaster });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    const { roomId, peerId } = socket;
    if (roomId && peerId) {
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter((user) => user.peerId !== peerId);
        console.log(`User disconnected: Room ${roomId}, Peer ID: ${peerId}`);
      }

      // Remove active screen sharer if the user was sharing
      if (activeScreenSharers[roomId] === peerId) {
        delete activeScreenSharers[roomId];
        io.to(roomId).emit("master-screen-sharing", { peerId: null });
      }

      socket.to(roomId).emit("user-disconnected", { peerId });

      // Assign a new master if the room still has users
      if (!activeScreenSharers[roomId] && rooms[roomId]?.length > 0) {
        const newMaster = rooms[roomId][0]?.peerId;
        activeScreenSharers[roomId] = newMaster;
        io.to(roomId).emit("master-screen-sharing", { peerId: newMaster });
      }
    }
  });
});

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
