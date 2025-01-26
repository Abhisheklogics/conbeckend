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

const activeScreenSharers = {}; // Track who is the master screen sharer
const rooms = {}; // Rooms to track users in them

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

        // Send existing users to the new user
        const existingUsers = rooms[roomId].filter((user) => user.socketId !== socket.id);
        socket.emit('receive-existing-users', { existingUsers });

        // If someone is already screen sharing, inform the new user
        if (activeScreenSharers[roomId]) {
            socket.emit('master-screen-sharing', { peerId: activeScreenSharers[roomId] });
        }

        socket.roomId = roomId;
        socket.peerId = peerId;
        socket.email = email;

        console.log(`${email} joined room ${roomId}`);
    });

    socket.on('screen-share-started', ({ roomId, peerId }) => {
        // Set the first user who starts sharing as the master
        if (!activeScreenSharers[roomId]) {
            activeScreenSharers[roomId] = peerId;
            io.to(roomId).emit('screen-share-update', { peerId, isSharing: true });
            console.log(`Screen sharing started by ${peerId} in room ${roomId}`);
        } else {
            socket.emit('error-message', { message: 'Screen sharing is already active!' });
        }
    });

    socket.on('screen-share-stopped', ({ roomId, peerId }) => {
        if (activeScreenSharers[roomId] === peerId) {
            delete activeScreenSharers[roomId];
            io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
            console.log(`Screen sharing stopped by ${peerId} in room ${roomId}`);
        }
    });

    socket.on('leave-room', ({ roomId, peerId }) => {
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(user => user.peerId !== peerId);
            socket.leave(roomId);
            socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
