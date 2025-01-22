import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

app.use(
  cors({
    origin: ['https://conexus-6asm.vercel.app/'],
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

const server = createServer(app);
const io = new Server(server, { cors: true });

const rooms = new Map(); // Map for rooms: roomId -> [{ socketId, peerId, email }]
const activeScreenSharers = new Map(); // Map for active screen sharers: roomId -> peerId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', ({ email }, callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomId, [{ socketId: socket.id, email }]);
    callback({ success: true, roomId });
    console.log(`Room ${roomId} created by ${email}`);
  });

  socket.on('join-room', ({ roomId, peerId, email }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, []);
    }
    const roomUsers = rooms.get(roomId);
    roomUsers.push({ socketId: socket.id, peerId, email });
    rooms.set(roomId, roomUsers);

    socket.join(roomId);
    socket.to(roomId).emit('user-connected', { peerId, email });

    const existingUsers = roomUsers.filter((user) => user.socketId !== socket.id);
    socket.emit('receive-existing-users', { existingUsers });

    socket.roomId = roomId;
    socket.peerId = peerId;
    socket.email = email;

    console.log(`${email} joined room ${roomId}`);
  });

  socket.on('screen-share-started', ({ roomId, peerId }) => {
    if (!activeScreenSharers.has(roomId)) {
      activeScreenSharers.set(roomId, peerId);
      io.to(roomId).emit('screen-share-update', { peerId, isSharing: true });
      console.log(`Screen sharing started by ${peerId} in room ${roomId}`);
    } else {
      socket.emit('error-message', { message: 'Screen sharing is already active!' });
    }
  });

  socket.on('screen-share-stopped', ({ roomId, peerId }) => {
    if (activeScreenSharers.get(roomId) === peerId) {
      activeScreenSharers.delete(roomId);
      io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
      console.log(`Screen sharing stopped by ${peerId} in room ${roomId}`);
    }
  });

  socket.on('leave-room', ({ roomId, peerId }) => {
    if (rooms.has(roomId)) {
      const updatedRoomUsers = rooms.get(roomId).filter((user) => user.peerId !== peerId);
      if (updatedRoomUsers.length > 0) {
        rooms.set(roomId, updatedRoomUsers);
      } else {
        rooms.delete(roomId);
      }

      socket.leave(roomId);
      socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });

      if (activeScreenSharers.get(roomId) === peerId) {
        activeScreenSharers.delete(roomId);
        io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const { roomId, peerId } = socket;
    if (roomId && rooms.has(roomId)) {
      const updatedRoomUsers = rooms.get(roomId).filter((user) => user.socketId !== socket.id);
      if (updatedRoomUsers.length > 0) {
        rooms.set(roomId, updatedRoomUsers);
      } else {
        rooms.delete(roomId);
      }

      socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });

      if (activeScreenSharers.get(roomId) === peerId) {
        activeScreenSharers.delete(roomId);
        io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
      }
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
