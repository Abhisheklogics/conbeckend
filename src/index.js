import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

const app = express();
dotenv.config();

app.use(cors({
  origin: ['https://conexus-6asm.vercel.app/'],  
  methods: ['GET', 'POST'],
  credentials: true,
}));

const server = createServer(app);
const io = new Server(server, {
  cors: true
});

const rooms = {};  // Store rooms and their users

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // User joins room
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

  // User leaves room
  socket.on('leave-room', ({ roomId, peerId }) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((user) => user.peerId !== peerId);
      socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });
    }
    socket.leave(roomId);
    console.log(`${socket.email} left room ${roomId}`);
  });

  // Handle screen share events
  socket.on('screen-share-started', ({ roomId, peerId, stream }) => {
    socket.to(roomId).emit('screen-share-update', { peerId, stream });
  });

  socket.on('screen-share-stopped', ({ roomId, peerId }) => {
    socket.to(roomId).emit('screen-share-update', { peerId, stream: null });
  });

  // User disconnects
  socket.on('disconnect', () => {
    const { roomId, peerId, email } = socket;

    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((user) => user.peerId !== peerId);
      socket.to(roomId).emit('user-disconnected', { peerId, email });
    }
    console.log(`${email || 'A user'} disconnected.`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
