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

let rooms = {}; // Store room users
let activeScreenSharers = {}; // Track active screen sharers

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, peerId, email }) => {
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push({ socketId: socket.id, peerId, email });

        socket.join(roomId);
        io.to(roomId).emit('user-list', rooms[roomId]); // Send updated user list
        io.to(roomId).emit('user-connected', { peerId });

        console.log(`${email} joined room ${roomId}`);
    });

    socket.on('screen-share-started', ({ roomId, peerId }) => {
        if (activeScreenSharers[roomId]) {
            io.to(roomId).emit('screen-share-update', { peerId: activeScreenSharers[roomId], isSharing: false });
        }
        activeScreenSharers[roomId] = peerId;
        io.to(roomId).emit('screen-share-update', { peerId, isSharing: true });
    });

    socket.on('screen-share-stopped', ({ roomId, peerId }) => {
        if (activeScreenSharers[roomId] === peerId) {
            delete activeScreenSharers[roomId];
            io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (let roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(user => user.socketId !== socket.id);
            io.to(roomId).emit('user-list', rooms[roomId]); 
        }
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
