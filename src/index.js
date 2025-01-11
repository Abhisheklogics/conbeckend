import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({
  path:'.env'
});

const app = express();
app.use(cors({
  origin: 'https://portfolo-eight.vercel.app/',
  methods: ['GET', 'POST']
}))
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://portfolo-eight.vercel.app/',
        methods: ['GET', 'POST']
    }
});

const users = {}; 

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (peerId) => {
        users[socket.id] = peerId;
        io.emit('update-users', Object.values(users)); // Send Peer IDs only
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
