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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, Name }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        // ❌ Duplicate user prevent
        const existingUser = rooms[roomId].find(user => user.id === socket.id);
        if (!existingUser) {
            rooms[roomId].push({ id: socket.id, Name });
        }

        // ✅ Notify all users in the room
        io.to(roomId).emit('update-user-list', rooms[roomId]);

        socket.join(roomId);
        console.log(`User ${Name} joined room: ${roomId}`);
    });

    socket.on('disconnect', () => {
        for (let roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
            io.to(roomId).emit('update-user-list', rooms[roomId]);
        }
        console.log('User disconnected:', socket.id);
    });
});

server.listen(process.env.PORT || 4000, () => {
    console.log(`Server is running on port ${process.env.PORT || 4000}`);
});
