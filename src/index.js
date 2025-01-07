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


app.use(cors({
  origin: 'https://conexusapp.netlify.app/', 
  methods: ['GET', 'POST'],
}));

const io = new Server(server, {
  cors: {
    origin: true  
   
  },
});

const rooms = {};

io.on('connection', socket => {
  console.log('A user connected: ', socket.id);

  // When a user joins a room
  socket.on('join room', roomID => {
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);  // Add user to the existing room
    } else {
      rooms[roomID] = [socket.id];  // Create a new room with the user
    }

    console.log(`User ${socket.id} joined room: ${roomID}`);

    // Notify all users in the room
    const usersInRoom = rooms[roomID];
    usersInRoom.forEach(userId => {
      if (userId !== socket.id) {
        socket.emit('user joined', userId);  // Notify the new user
        socket.to(userId).emit('user joined', socket.id);  // Notify others about the new user
      }
    });
  });

  // Handle offer
  socket.on('offer', payload => {
    console.log('Sending offer to', payload.target);
    io.to(payload.target).emit('offer', payload);  // Send offer to target user
  });

  // Handle answer
  socket.on('answer', payload => {
    console.log('Sending answer to', payload.target);
    io.to(payload.target).emit('answer', payload);  // Send answer to target user
  });

  // Handle ICE candidate
  socket.on('ice-candidate', incoming => {
    console.log('Sending ICE candidate to', incoming.target);
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);  // Send ICE candidate to target user
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id);
    for (let roomID in rooms) {
      const index = rooms[roomID].indexOf(socket.id);
      if (index !== -1) {
        rooms[roomID].splice(index, 1);  // Remove the user from the room
        const remainingUsers = rooms[roomID];
        
        // Notify remaining users in the room
        remainingUsers.forEach(userId => {
          socket.to(userId).emit('user left', socket.id);  // Notify others
        });

        if (remainingUsers.length === 0) {
          delete rooms[roomID];  // Clean up if no users are left in the room
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
