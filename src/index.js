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

dotenv.config({
  path: '.env'
});

const app = express();

// Production setup for HTTPS (Only in production environment)
let server;

server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // Use environment variable to store the frontend URL
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL, // Use environment variable to store the frontend URL
  methods: ['GET', 'POST']
}));

const rooms = {}; // Store users in rooms
const currentlySharing = {}; // Track screen sharing for each room

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join room', (roomID) => {
    if (rooms[roomID]) {
      if (rooms[roomID].length < 2) {
        rooms[roomID].push(socket.id);
      } else {
        socket.emit('room full', 'Room is full. Only two users can join.');
        return;
      }
    } else {
      rooms[roomID] = [socket.id];
    }

    const otherUser = rooms[roomID].find((id) => id !== socket.id);
    if (otherUser) {
      socket.emit('other user', otherUser);
      socket.to(otherUser).emit('user joined', socket.id);
    }
  });

  socket.on('check screen sharing', (roomID, userID) => {
    // Check if someone else is already sharing the screen in the room
    if (currentlySharing[roomID]) {
      socket.emit("screen sharing denied", "Another user is already sharing the screen.");
    } else {
      socket.emit("screen sharing allowed");
    }
  });

  socket.on('start screen sharing', (roomID, userID) => {
    currentlySharing[roomID] = userID;
    socket.to(roomID).emit("screen sharing started", userID);
  });

  socket.on('stop screen sharing', (roomID, userID) => {
    delete currentlySharing[roomID];
    socket.to(roomID).emit("screen sharing stopped");
  });

  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (incoming) => {
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });

  socket.on('disconnect', () => {
    // Disconnect logic remains the same...
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server is running on port ${port}`));
