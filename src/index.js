import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: true });

// Set up PeerJS server
const peerServer = ExpressPeerServer(server, {
  path: "/peerjs",
  debug: true,
});
app.use("/peerjs", peerServer);

app.use(
  cors({
    origin: ["https://conexus-6asm.vercel.app/"], // Replace with your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const rooms = {}; // In-memory room storage

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ code, role }) => {
    if (!rooms[code]) {
      rooms[code] = { master: null, slaves: [] };
    }

    if (role === "master") {
      if (rooms[code].master) {
        socket.emit("roomError", { message: "A master already exists for this room." });
        return;
      }
      rooms[code].master = socket.id;
      console.log(`Master joined room: ${code}`);
    } else {
      rooms[code].slaves.push(socket.id);
      console.log(`Slave joined room: ${code}`);
    }

    socket.join(code);
    io.to(code).emit("updateSlaveCount", rooms[code].slaves.length);
  });

  socket.on("stopScreenSharing", ({ code }) => {
    if (rooms[code]?.master === socket.id) {
      io.to(code).emit("screenSharingStopped");
      console.log(`Master stopped screen sharing for room: ${code}`);
    }
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];

      if (room.master === socket.id) {
        io.to(code).emit("roomClosed");
        delete rooms[code];
        console.log(`Room ${code} closed by master.`);
      } else if (room.slaves.includes(socket.id)) {
        room.slaves = room.slaves.filter((id) => id !== socket.id);
        io.to(code).emit("updateSlaveCount", room.slaves.length);
        console.log(`Slave disconnected from room: ${code}`);
      }
    });

    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
