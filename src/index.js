import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

app.use(cors({
    origin: ['https://conexus-meet.vercel.app/'],
    methods: ['GET', 'POST'],
    credentials: true,
}));

const server = createServer(app);
const io = new Server(server, { cors: { origin: true } });

let rooms = {};

io.on('connection', (socket) => {
    console.log('✅ New connection:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        console.log(`🔗 User ${userId} joining room: ${roomId}`);

        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push(userId);

        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${userId}`);
            rooms[roomId] = rooms[roomId].filter(user => user !== userId);
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

server.listen(process.env.PORT || 4000, () => {
    console.log(`🚀 Server running on port ${process.env.PORT || 4000}`);
});
