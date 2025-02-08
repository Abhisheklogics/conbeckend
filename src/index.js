import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

app.use(cors({ origin: ['https://conexus-meet.vercel.app/'], methods: ['GET', 'POST'], credentials: true }));

const server = createServer(app);
const io = new Server(server, { cors: { origin: true } });

let rooms = {};

io.on('connection', (socket) => {
    console.log('✅ New connection:', socket.id);

    socket.on('join-room', ({ roomId, userId }) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', { userId, socketId: socket.id });
    });

    socket.on('screen-share', ({ roomId, userId }) => {
        io.to(roomId).emit('screen-share-started', { userId });
    });

    socket.on('stop-screen-share', ({ roomId, userId }) => {
        io.to(roomId).emit('screen-share-stopped', { userId });
    });

    socket.on('disconnect', () => {
        io.emit('user-disconnected', socket.id);
    });
});

server.listen(4000, () => console.log(`🚀 Server running on port 4000`));
