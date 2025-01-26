import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

// Enable CORS for frontend
app.use(cors({
    origin: ['https://conexus-6asm.vercel.app/'], // Frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
}));

const server = createServer(app);
const io = new Server(server, { cors: true });

// Room and active screen sharers storage
const rooms = {}; 
const activeScreenSharers = {}; 

// Socket.io connection event
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a room
    socket.on('create-room', ({ email }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = [{ socketId: socket.id, email }];
        callback({ success: true, roomId });
        console.log(`Room ${roomId} created by ${email}`);
    });

    // Join an existing room
    socket.on('join-room', ({ roomId, peerId, email }) => {
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push({ socketId: socket.id, peerId, email });

        socket.join(roomId);
        socket.to(roomId).emit('user-connected', { peerId, email });

        // Send existing users list
        const existingUsers = rooms[roomId].filter((user) => user.socketId !== socket.id);
        socket.emit('receive-existing-users', { existingUsers });

        socket.roomId = roomId;
        socket.peerId = peerId;
        socket.email = email;

        console.log(`${email} joined room ${roomId}`);
    });

    // Start screen sharing
    socket.on('screen-share-started', ({ roomId, peerId }) => {
        if (!activeScreenSharers[roomId]) {
            activeScreenSharers[roomId] = peerId;
            io.to(roomId).emit('screen-share-update', { peerId, isSharing: true });
            console.log(`Screen sharing started by ${peerId} in room ${roomId}`);
        } else {
            socket.emit('error-message', { message: 'Screen sharing is already active!' });
        }
    });

    // Stop screen sharing
    socket.on('screen-share-stopped', ({ roomId, peerId }) => {
        if (activeScreenSharers[roomId] === peerId) {
            delete activeScreenSharers[roomId];
            io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
            console.log(`Screen sharing stopped by ${peerId} in room ${roomId}`);
        }
    });

    // User leaves the room
    socket.on('leave-room', ({ roomId, peerId }) => {
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(user => user.peerId !== peerId);
            socket.leave(roomId);
            socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });
            console.log(`${socket.email} left room ${roomId}`);
        }
    });

    // User disconnects
    socket.on('disconnect', () => {
        if (socket.roomId) {
            rooms[socket.roomId] = rooms[socket.roomId].filter(user => user.socketId !== socket.id);
            io.to(socket.roomId).emit('user-disconnected', { peerId: socket.peerId, email: socket.email });
        }
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
