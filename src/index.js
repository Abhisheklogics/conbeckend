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

// Store the master peerId for each room
const rooms = {}; 

// On user connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create-room', ({ email }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = { master: null, users: [] };
        callback({ success: true, roomId });
        console.log(`Room ${roomId} created by ${email}`);
    });

    // On user joining room
    socket.on('join-room', ({ roomId, peerId, email }) => {
        if (!rooms[roomId]) rooms[roomId] = { master: null, users: [] };

        rooms[roomId].users.push({ socketId: socket.id, peerId, email });

        if (!rooms[roomId].master) {
            rooms[roomId].master = peerId;  // Assign master
            socket.emit('master-assigned', { isMaster: true });
        } else {
            socket.emit('master-assigned', { isMaster: false });
        }

        socket.join(roomId);
        socket.to(roomId).emit('user-connected', { peerId, email });

        // Send existing users list
        const existingUsers = rooms[roomId].users.filter(user => user.socketId !== socket.id);
        socket.emit('receive-existing-users', { existingUsers });

        console.log(`${email} joined room ${roomId}`);
    });

    // Start screen sharing (only allowed for the master)
    socket.on('screen-share-started', ({ roomId, peerId }) => {
        if (rooms[roomId].master === peerId) {
            socket.to(roomId).emit('screen-share-update', { peerId, isSharing: true });
            console.log(`Screen sharing started by ${peerId} in room ${roomId}`);
        } else {
            socket.emit('error-message', { message: 'Only the master can share their screen!' });
        }
    });

    // Stop screen sharing
    socket.on('screen-share-stopped', ({ roomId, peerId }) => {
        if (rooms[roomId].master === peerId) {
            socket.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
            console.log(`Screen sharing stopped by ${peerId} in room ${roomId}`);
        }
    });

    // User leaves room
    socket.on('leave-room', ({ roomId, peerId }) => {
        if (rooms[roomId]) {
            rooms[roomId].users = rooms[roomId].users.filter(user => user.peerId !== peerId);
            socket.leave(roomId);
            socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });
            console.log(`${socket.email} left room ${roomId}`);
        }
    });

    // User disconnects
    socket.on('disconnect', () => {
        if (socket.roomId) {
            rooms[socket.roomId].users = rooms[socket.roomId].users.filter(user => user.socketId !== socket.id);
            io.to(socket.roomId).emit('user-disconnected', { peerId: socket.peerId, email: socket.email });
        }
        console.log('User disconnected:', socket.id);
    });
});
server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
