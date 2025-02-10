import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

app.use(cors({
        origin: ['https://conexus-meet.vercel.app/'],
              methods: ['GET', 'POST']
}));

const server = createServer(app);
const io = new Server(server, { cors: { origin: true } });

let rooms = {}; // Store room users and screen sharer

io.on('connection', (socket) => {
    console.log('✅ New connection:', socket.id);

    socket.on('join-room', ({ roomId, userId, name }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { users: [], screenSharer: null };
        }
        rooms[roomId].users.push({ userId, name, socketId: socket.id });
        socket.join(roomId);
        io.to(roomId).emit('user-list', rooms[roomId].users);
    });

    socket.on('screen-share', ({ roomId, userId, stream }) => {
        if (rooms[roomId]) {
            rooms[roomId].screenSharer = userId;
            io.to(roomId).emit('screen-share-started', { userId, stream });
        }
    });

    socket.on('stop-screen-share', ({ roomId, userId }) => {
        if (rooms[roomId] && rooms[roomId].screenSharer === userId) {
            rooms[roomId].screenSharer = null;
            io.to(roomId).emit('screen-share-stopped', { userId });
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].users = rooms[roomId].users.filter(user => user.socketId !== socket.id);
            if (rooms[roomId].screenSharer === socket.id) {
                io.to(roomId).emit('screen-share-stopped', { userId: socket.id });
                rooms[roomId].screenSharer = null;
            }
            io.to(roomId).emit('user-list', rooms[roomId].users);
        }
    });
});

server.listen(4000, () => console.log(`🚀 Server running on port 4000`));
