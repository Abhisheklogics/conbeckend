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

const app = express();
dotenv.config({
  path: '.env'
});
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://conexusapp.netlify.app/', // No trailing slash here
    methods: ['GET', 'POST']
  }
});

const rooms = {}; // Store users in rooms

app.use(cors({
  origin: 'https://conexusapp.netlify.app/', // No trailing slash here
}));

io.on("connection", socket => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join room", roomID => {
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
    // Handle offer from a user
  socket.on("offer", payload => {
    io.to(payload.target).emit("offer", payload);
  });

  // Handle answer from a user
  socket.on("answer", payload => {
    io.to(payload.target).emit("answer", payload);
  });

  // Handle ICE candidate from a user
  socket.on("ice-candidate", incoming => {
    io.to(incoming.target).emit("ice-candidate", incoming.candidate);
  });

  // Handle user disconnecting
  socket.on("disconnect", () => {
    for (const roomID in rooms) {
      const index = rooms[roomID].indexOf(socket.id);
      if (index !== -1) {
        rooms[roomID].splice(index, 1); // Remove user from room
        console.log(`User ${socket.id} disconnected from room: ${roomID}`);

        if (rooms[roomID].length === 0) {
          delete rooms[roomID]; // Cleanup the room if no users are left
          console.log(`Room ${roomID} is now empty and removed`);
        } else {
          // Notify the other user that someone left the room
          const remainingUser = rooms[roomID][0];
          socket.to(remainingUser).emit("user left", socket.id);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
