import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",  // React client origin
    methods: ["GET", "POST"],
  },
});

const rooms = {};

app.use(cors());

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  // Handle user joining the room
  socket.on("join room", (roomID) => {
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }

    const otherUser = rooms[roomID].find((id) => id !== socket.id);
    if (otherUser) {
      socket.emit("other user", otherUser);
      socket.to(otherUser).emit("user joined", socket.id);
    }
  });

  // Handle screen share broadcast
  socket.on("start-screen-share", (data) => {
    const { roomID, peerId, stream } = data;
    socket.to(roomID).emit("screen-share", { peerId, stream }); // Broadcast screen stream to others
  });

  // Handle the offer, answer, and ICE candidates for WebRTC
  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("ice-candidate", (incoming) => {
    io.to(incoming.target).emit("ice-candidate", incoming.candidate);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    for (let roomID in rooms) {
      rooms[roomID] = rooms[roomID].filter((id) => id !== socket.id);
      io.to(roomID).emit("current-users", rooms[roomID]);
    }
    console.log("User disconnected: " + socket.id);
  });
});

server.listen(8000, () => {
  console.log("Server is running on port 8000");
});
