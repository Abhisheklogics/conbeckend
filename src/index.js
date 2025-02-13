import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const server = createServer(app);
app.use(cors({
    origin: ["https://conexus-meet.vercel.app"], // ✅ Frontend URL
    methods: ["GET", "POST"]
}));

const io = new Server(server, {
    cors: {
        origin: ["https://conexus-meet.vercel.app"], // ✅ Frontend allowed only
        methods: ["GET", "POST"]
    }
});


// ✅ PeerJS Server Setup
const peerServer = ExpressPeerServer(server, { debug: true, path: "/" });
app.use("/peerjs", peerServer);

let screenSharer = null;
let viewers = new Set();

io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  socket.on("start-screen-share", ({ peerId }) => {
    if (screenSharer) {
      io.to(socket.id).emit("screen-share-error", "Another user is already sharing.");
      return;
    }
    screenSharer = peerId;
    io.emit("screen-share-started", { peerId });
    console.log("📡 Screen Sharing Started:", peerId);
  });

  socket.on("stop-screen-share", () => {
    if (screenSharer) {
      io.emit("screen-share-stopped");
      console.log("❌ Screen Sharing Stopped");
      screenSharer = null;
    }
  });

  socket.on("disconnect", () => {
    if (screenSharer === socket.id) {
      io.emit("screen-share-stopped");
      screenSharer = null;
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
