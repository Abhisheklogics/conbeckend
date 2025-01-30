// ---------------------- SERVER SIDE (Express + Socket.io) ----------------------
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
const io = new Server(server, { cors: true });

let rooms = {}; // Store room details and connected users
let activeScreenSharers = {}; // Track active screen sharers in each room

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create room
    socket.on('create-room', ({ email }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = [{ socketId: socket.id, email }];
        callback({ success: true, roomId });
        console.log(`Room ${roomId} created by ${email}`);
    });

    // Join room
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

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        for (let roomId in rooms) {
            const roomUsers = rooms[roomId];
            const userIndex = roomUsers.findIndex(user => user.socketId === socket.id);
            if (userIndex !== -1) {
                const { peerId, email } = roomUsers[userIndex];
                rooms[roomId].splice(userIndex, 1);
                socket.to(roomId).emit('user-disconnected', { peerId, email });
                
                if (activeScreenSharers[roomId] === peerId) {
                    delete activeScreenSharers[roomId];
                    io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
                }
                break;
            }
        }
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
