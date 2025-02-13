import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const server = createServer(app);

app.use(cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"]
}));

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});

const rooms = new Map(); // Store users in rooms

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId, userId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(userId);

        socket.join(roomId);
        socket.to(roomId).emit("user-connected", userId);

        socket.on("disconnect", () => {
            rooms.get(roomId)?.delete(userId);
            if (rooms.get(roomId)?.size === 0) {
                rooms.delete(roomId); // Delete empty rooms
            }
            socket.to(roomId).emit("user-disconnected", userId);
        });
    });
});

// ✅ **API to check if a room exists**
app.get("/check-room/:roomId", (req, res) => {
    const { roomId } = req.params;
    if (rooms.has(roomId)) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
