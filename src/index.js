import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

app.use(cors({
    origin: ['https://conexus-6asm.vercel.app/'],
    methods: ['GET', 'POST'],
    credentials: true,
}));

const server = createServer(app);
const io = new Server(server, { cors: true });

const rooms = {}; 
const activeScreenSharers = {}; // Modified to store multiple screen sharers

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create-room', ({ email }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = [{ socketId: socket.id, email }];
        callback({ success: true, roomId });
        console.log(`Room ${roomId} created by ${email}`);
    });

    socket.on('join-room', ({ roomId, peerId, email }) => {
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push({ socketId: socket.id, peerId, email });

        socket.join(roomId);
        socket.to(roomId).emit('user-connected', { peerId, email });

        const existingUsers = rooms[roomId].filter((user) => user.socketId !== socket.id);
        socket.emit('receive-existing-users', { existingUsers });

        socket.roomId = roomId;
        socket.peerId = peerId;
        socket.email = email;

        console.log(`${email} joined room ${roomId}`);
    });

    socket.on('screen-share-started', ({ roomId, peerId }) => {
        if (!activeScreenSharers[roomId]) {
            activeScreenSharers[roomId] = [];
        }
        // Add peerId to the active sharers list
        if (!activeScreenSharers[roomId].includes(peerId)) {
            activeScreenSharers[roomId].push(peerId);
            io.to(roomId).emit('screen-share-update', { peerId, isSharing: true });
            console.log(`Screen sharing started by ${peerId} in room ${roomId}`);
        }
    });

    socket.on('screen-share-stopped', ({ roomId, peerId }) => {
        if (activeScreenSharers[roomId]) {
            activeScreenSharers[roomId] = activeScreenSharers[roomId].filter(id => id !== peerId);
            io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
            console.log(`Screen sharing stopped by ${peerId} in room ${roomId}`);
        }
    });

    socket.on('leave-room', ({ roomId, peerId }) => {
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(user => user.peerId !== peerId);
            socket.leave(roomId);
            socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });
            console.log(`${socket.email} left room ${roomId}`);
        }
    });

    socket.on('disconnect', () => {
        if (socket.roomId) {
            rooms[socket.roomId] = rooms[socket.roomId].filter(user => user.socketId !== socket.id);
            io.to(socket.roomId).emit('user-disconnected', { peerId: socket.peerId, email: socket.email });
        }
        console.log('User disconnected:', socket.id);
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
