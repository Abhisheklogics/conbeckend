import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors({ origin: ["https://conexus-meet.vercel.app"] }));

// ✅ Setup PeerJS Server on `/peerjs`
const peerServer = ExpressPeerServer(server, {
  path: "/peerjs",
  debug: true,
});

app.use("/peerjs", peerServer);

let rooms = {}; // Store active rooms

io.on("connection", (socket) => {
  console.log("✅ New user connected:", socket.id);

  socket.on("join-room", ({ roomId, userId, name }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { users: {}, screenSharer: null };
    }
    rooms[roomId].users[userId] = { name, socketId: socket.id };
    socket.join(roomId);
    io.to(roomId).emit("user-list", Object.values(rooms[roomId].users));

    if (rooms[roomId].screenSharer) {
      io.to(socket.id).emit("screen-share-started", { userId: rooms[roomId].screenSharer });
    }
  });

  socket.on("screen-share", ({ roomId, userId }) => {
    if (rooms[roomId] && !rooms[roomId].screenSharer) {
      rooms[roomId].screenSharer = userId;
      io.to(roomId).emit("screen-share-started", { userId });
    }
  });

  socket.on("stop-screen-share", ({ roomId, userId }) => {
    if (rooms[roomId]?.screenSharer === userId) {
      rooms[roomId].screenSharer = null;
      io.to(roomId).emit("screen-share-stopped");
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      let userId = null;
      Object.entries(rooms[roomId].users).forEach(([id, user]) => {
        if (user.socketId === socket.id) userId = id;
      });

      if (userId) {
        delete rooms[roomId].users[userId];
        if (rooms[roomId].screenSharer === userId) {
          io.to(roomId).emit("screen-share-stopped");
          rooms[roomId].screenSharer = null;
        }
        io.to(roomId).emit("user-list", Object.values(rooms[roomId].users));
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
