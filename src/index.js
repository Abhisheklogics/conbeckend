import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors({ origin: ['https://conexus-meet.vercel.app/'], methods: ['GET', 'POST'] }));
const server = createServer(app);
const io = new Server(server, { cors: { origin: true } });

let rooms = {}; // Room data store

io.on('connection', (socket) => {
    console.log('✅ New user connected:', socket.id);

    socket.on('join-room', ({ roomId, userId, name }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { users: {}, screenSharer: null };
        }
        rooms[roomId].users[userId] = { name, socketId: socket.id };
        socket.join(roomId);
        io.to(roomId).emit('user-list', Object.values(rooms[roomId].users));

        // Agar koi screen share kar raha hai to naya user uska stream le sake
        if (rooms[roomId].screenSharer) {
            io.to(socket.id).emit('screen-share-started', { userId: rooms[roomId].screenSharer });
        }
    });

    socket.on('screen-share', ({ roomId, userId }) => {
        if (rooms[roomId] && !rooms[roomId].screenSharer) {
            rooms[roomId].screenSharer = userId;
            io.to(roomId).emit('screen-share-started', { userId });

            // Notify all users to receive the screen stream
            Object.values(rooms[roomId].users).forEach(user => {
                if (userId !== user.socketId) {
                    io.to(user.socketId).emit('receive-screen-stream', { screenSharer: userId });
                }
            });
        }
    });

    socket.on('stop-screen-share', ({ roomId, userId }) => {
        if (rooms[roomId]?.screenSharer === userId) {
            rooms[roomId].screenSharer = null;
            io.to(roomId).emit('screen-share-stopped');
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            let userId = null;
            Object.entries(rooms[roomId].users).forEach(([id, user]) => {
                if (user.socketId === socket.id) userId = id;
            });

            if (userId) {
                delete rooms[roomId].users[userId];

                if (rooms[roomId].screenSharer === userId) {
                    io.to(roomId).emit('screen-share-stopped');
                    rooms[roomId].screenSharer = null;
                }

                io.to(roomId).emit('user-list', Object.values(rooms[roomId].users));
            }
        }
    });
});

server.listen(4000, () => console.log(`🚀 Server running on port 4000`));
