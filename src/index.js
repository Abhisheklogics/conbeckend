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

    socket.on('join-room', ({ roomId, userId }) => {
        console.log(`🔗 User ${userId} joining room: ${roomId}`);

        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push({ userId, socketId: socket.id });

        socket.join(roomId);
        // Send the list of existing users to the newly joined user
        socket.emit('existing-users', rooms[roomId]);

        
        socket.to(roomId).emit('user-connected', { userId, socketId: socket.id });
    });

    socket.on('offer', (payload) => {
        io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload) => {
        io.to(payload.target).emit('ice-candidate', payload);
    });

    socket.on('screen-share', ({ roomId, userId }) => {
        io.to(roomId).emit('screen-share-started', { userId });
    });

    socket.on('stop-screen-share', ({ roomId, userId }) => {
        io.to(roomId).emit('screen-share-stopped', { userId });
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter((user) => user.socketId !== socket.id);
            io.to(roomId).emit('user-disconnected', socket.id);
        }
    });
});

server.listen(process.env.PORT || 4000, () => {
    console.log(`🚀 Server running on port ${process.env.PORT || 4000}`);
});