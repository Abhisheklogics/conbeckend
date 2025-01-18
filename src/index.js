import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

const app = express();
dotenv.config();

app.use(cors({
  origin: ['https://conexus-6asm.vercel.app/'],  // Make sure this matches your frontend URL
  methods: ['GET', 'POST'],
  credentials: true,
}));

const server = createServer(app);
const io = new Server(server, {
  cors: true
});

const rooms = {};  // Object to hold room data

// Handle incoming socket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle join-room event
  socket.on('join-room', ({ roomId, peerId, email }) => {
    // Create the room if it doesn't exist
    if (!rooms[roomId]) rooms[roomId] = [];

    // Add the user to the room
    rooms[roomId].push({ socketId: socket.id, peerId, email });

    socket.join(roomId);  // Join the socket to the room

    // Notify other users that a new user has connected
    socket.to(roomId).emit('user-connected', { peerId, email });

    // Send existing users in the room to the new user
    const existingUsers = rooms[roomId].filter((user) => user.socketId !== socket.id);
    socket.emit('receive-existing-users', { existingUsers });

    // Store user info in the socket for later use
    socket.roomId = roomId;
    socket.peerId = peerId;
    socket.email = email;

    console.log(`${email} joined room ${roomId}`);
  });

  // Handle leave-room event
  socket.on('leave-room', ({ roomId, peerId }) => {
    if (rooms[roomId]) {
      // Remove the user from the room's list of users
      rooms[roomId] = rooms[roomId].filter((user) => user.peerId !== peerId);

      // Notify other users that the user has left
      socket.to(roomId).emit('user-disconnected', { peerId, email: socket.email });
    }
    socket.leave(roomId);
    console.log(`${socket.email} left room ${roomId}`);
  });

  // Handle disconnection event
  socket.on('disconnect', () => {
    const { roomId, peerId, email } = socket;

    if (roomId && rooms[roomId]) {
      // Remove the user from the room's list
      rooms[roomId] = rooms[roomId].filter((user) => user.peerId !== peerId);

      // Notify other users that this user has disconnected
      socket.to(roomId).emit('user-disconnected', { peerId, email });
    }
    console.log(`${email || 'A user'} disconnected.`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
