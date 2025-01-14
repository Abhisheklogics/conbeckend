import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
const server = createServer(app);
app.use(cors({
    origin: 'https://conexus-6asm.vercel.app/', // Replace with your frontend URL
    methods: ['GET', 'POST'],
}));

const io = new Server(server, {
    cors: true,
});

const rooms = {}; 

io.on('connection', (socket) => {
    console.log("User connected:", socket.id);

    socket.on('join-room', ({ roomId, peerId, email }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { users: [], screenSharing: null };
        }
        rooms[roomId].users.push({ peerId, email });
        socket.join(roomId);
        socket.emit('receive-existing-users', {
            peerId, 
            existingUsers: rooms[roomId].users.filter(user => user.peerId !== peerId)
        });
        socket.broadcast.to(roomId).emit('user-connected', { peerId, email });
    });

    socket.on('screen-share-started', ({ roomId, peerId }) => {
        if (!rooms[roomId]?.screenSharing) {
            rooms[roomId].screenSharing = peerId;
            io.to(roomId).emit('screen-share-started', { peerId });
        }
    });

    socket.on('screen-share-stopped', ({ roomId }) => {
        rooms[roomId].screenSharing = null;
        io.to(roomId).emit('screen-share-stopped');
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].users = rooms[roomId].users.filter(user => user.peerId !== socket.id);

            if (rooms[roomId].screenSharing === socket.id) {
                rooms[roomId].screenSharing = null;
                io.to(roomId).emit('screen-share-stopped');
            }

            socket.broadcast.to(roomId).emit('user-disconnected', { peerId: socket.id });

            if (rooms[roomId].users.length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
