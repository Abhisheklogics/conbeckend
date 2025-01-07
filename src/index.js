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

// Middleware for handling CORS
app.use(cors({
  origin: 'https://conexusapp.netlify.app/', 
  methods: ['GET', 'POST'],
}));

// Initialize the Socket.IO server
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins (since specific ones are already set in cors above)
  },
});

// Store room details (roomID: [socketIDs])
const rooms = {};

io.on('connection', socket => {
  console.log('A user connected: ', socket.id);

  // Handle when a user joins a room
  socket.on('join room', roomID => {
    // Check if the room exists and add the user to it
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id]; // Create a new room if it doesn't exist
    }

    console.log(`User ${socket.id} joined room: ${roomID}`);

    // Check if there's another user in the room to establish the WebRTC connection
    const otherUser = rooms[roomID].find(id => id !== socket.id);
    if (otherUser) {
      socket.emit('other user', otherUser); // Notify the new user about the other user
      socket.to(otherUser).emit('user joined', socket.id); // Notify the other user about the new user
    }
  });

  // Handle offer event
  socket.on('offer', payload => {
    console.log('Sending offer to', payload.target);
    io.to(payload.target).emit('offer', payload);
  });

  // Handle answer event
  socket.on('answer', payload => {
    console.log('Sending answer to', payload.target);
    io.to(payload.target).emit('answer', payload);
  });

  // Handle ICE candidate event
  socket.on('ice-candidate', incoming => {
    console.log('Sending ICE candidate to', incoming.target);
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });

  // Handle disconnect event
  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id);

    // Cleanup when a user disconnects
    for (let roomID in rooms) {
      const index = rooms[roomID].indexOf(socket.id);
      if (index !== -1) {
        rooms[roomID].splice(index, 1); // Remove the user from the room

        // Notify the other user in the room that the current user left
        const otherUser = rooms[roomID][0];
        if (otherUser) {
          socket.to(otherUser).emit('user left', socket.id); 
        }

        // If no users are left in the room, delete the room
        if (rooms[roomID].length === 0) {
          delete rooms[roomID];
        }
        break; // Break the loop once the user is found and removed
      }
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
