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


const rooms = new Map(); 
const activeScreenSharers = new Map(); 

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', ({ email }, callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomId, [{ socketId: socket.id, peerId: null, email }]);
    socket.roomId = roomId;
    socket.email = email;
    socket.join(roomId);
    callback({ success: true, roomId });
    console.log(`Room ${roomId} created by ${email}`);
  });

  // Join an existing room
  socket.on('join-room', ({ roomId, peerId, email }) => {
    if (!rooms.has(roomId)) {
      socket.emit('error-message', { message: 'Room does not exist!' });
      return;
    }

    const roomUsers = rooms.get(roomId);
    roomUsers.push({ socketId: socket.id, peerId, email });
    rooms.set(roomId, roomUsers);

    socket.roomId = roomId;
    socket.peerId = peerId;
    socket.email = email;
    socket.join(roomId);

    console.log(`${email} joined room ${roomId}`);

    // Notify existing users in the room
    const existingUsers = roomUsers.filter((user) => user.socketId !== socket.id);
    socket.emit('receive-existing-users', { existingUsers });
    socket.to(roomId).emit('user-connected', { peerId, email });
  });

  // Start screen sharing
  socket.on('screen-share-started', ({ roomId, peerId }) => {
    if (activeScreenSharers.has(roomId)) {
      socket.emit('error-message', { message: 'Screen sharing is already active in this room!' });
      return;
    }
    activeScreenSharers.set(roomId, peerId);
    io.to(roomId).emit('screen-share-update', { peerId, isSharing: true });
    console.log(`Screen sharing started by ${peerId} in room ${roomId}`);
  });

  // Stop screen sharing
  socket.on('screen-share-stopped', ({ roomId, peerId }) => {
    if (activeScreenSharers.get(roomId) === peerId) {
      activeScreenSharers.delete(roomId);
      io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
      console.log(`Screen sharing stopped by ${peerId} in room ${roomId}`);
    }
  });

  // Leave a room
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

      // Stop screen sharing if the user was sharing
      if (activeScreenSharers.get(roomId) === peerId) {
        activeScreenSharers.delete(roomId);
        io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const { roomId, peerId } = socket;

    if (roomId && rooms.has(roomId)) {
      const updatedRoomUsers = rooms.get(roomId).filter((user) => user.socketId !== socket.id);
      if (updatedRoomUsers.length > 0) {
        rooms.set(roomId, updatedRoomUsers);
      } else {
        rooms.delete(roomId);
      }

      socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });

      // Stop screen sharing if the user was sharing
      if (activeScreenSharers.get(roomId) === peerId) {
        activeScreenSharers.delete(roomId);
        io.to(roomId).emit('screen-share-update', { peerId, isSharing: false });
      }
    }
  });
});

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
