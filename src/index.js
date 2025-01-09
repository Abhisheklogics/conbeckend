/*import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";


const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: 'http://localhost:5173/',
    methods: ["GET", "POST"],
  })
);

const io = new Server(server, {
  cors: true,
});


const rooms = {};

io.on("connection", socket => {
  console.log(`User connected: ${socket.id}`); // Log user connection

  socket.on("join room", roomID => {
    console.log(`User ${socket.id} joining room ${roomID}`); // Log room join
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }

    const otherUser = rooms[roomID].find(id => id !== socket.id);
    if (otherUser) {
      socket.emit("other user", otherUser);
      socket.to(otherUser).emit("user joined", socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    // Additional disconnection logic...
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});*/
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const server = http.createServer(app);

// Set up CORS
app.use(cors({
  origin: 'https://conexusapp.netlify.app/', 
  methods: ['GET', 'POST'],
}));

const io = new Server(server, {
  cors: true,
});

// Store rooms and their users
const rooms = {};

io.on('connection', socket => {
  console.log('A user connected: ', socket.id);

  // Join a room
  socket.on('join room', roomID => {
    if (!rooms[roomID]) {
      rooms[roomID] = [];
    }

    // Add the user to the room
    rooms[roomID].push(socket.id);
    console.log(`User ${socket.id} joined room: ${roomID}`);

    // Notify the existing users in the room
    socket.to(roomID).emit('user joined', socket.id);

    // Send the list of other users to the newly joined user
    const otherUsers = rooms[roomID].filter(id => id !== socket.id);
    socket.emit('other users', otherUsers);

    // For each existing user, send them a message with the new user joining
    otherUsers.forEach(otherUser => {
      socket.emit('other user', otherUser);
      socket.to(otherUser).emit('user joined', socket.id);
    });
  });

  // Handle offer from a user
  socket.on('offer', payload => {
    console.log('Sending offer to', payload.target);
    io.to(payload.target).emit('offer', payload);
  });

  // Handle answer from a user
  socket.on('answer', payload => {
    console.log('Sending answer to', payload.target);
    io.to(payload.target).emit('answer', payload);
  });

  // Handle ICE candidate
  socket.on('ice-candidate', incoming => {
    console.log('Sending ICE candidate to', incoming.target);
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id);

    // Find the room the user is in and remove them
    for (let roomID in rooms) {
      const index = rooms[roomID].indexOf(socket.id);
      if (index !== -1) {
        // Remove user from the room
        rooms[roomID].splice(index, 1);

        // Notify the remaining users in the room that this user has left
        const otherUsers = rooms[roomID].filter(id => id !== socket.id);
        otherUsers.forEach(otherUser => {
          socket.to(otherUser).emit('user left', socket.id);
        });

        // If no users are left in the room, delete the room
        if (rooms[roomID].length === 0) {
          delete rooms[roomID];
        }

        break;
      }
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
