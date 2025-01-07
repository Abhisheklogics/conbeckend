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
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  methods: ['GET', 'POST'],
}));

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',  
    methods: ['GET', 'POST'],
  },
});

const rooms = {};

io.on('connection', socket => {
  console.log('A user connected: ', socket.id);


  socket.on('join room', roomID => {
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }

    console.log(`User ${socket.id} joined room: ${roomID}`);

    const otherUser = rooms[roomID].find(id => id !== socket.id);
    if (otherUser) {
      socket.emit('other user', otherUser); 
      socket.to(otherUser).emit('user joined', socket.id); 
    }
  });

  socket.on('offer', payload => {
    console.log('Sending offer to', payload.target);
    io.to(payload.target).emit('offer', payload);
  });

  
  socket.on('answer', payload => {
    console.log('Sending answer to', payload.target);
    io.to(payload.target).emit('answer', payload);
  });

 
  socket.on('ice-candidate', incoming => {
    console.log('Sending ICE candidate to', incoming.target);
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });

  
  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id);

    
    for (let roomID in rooms) {
      const index = rooms[roomID].indexOf(socket.id);
      if (index !== -1) {
        rooms[roomID].splice(index, 1); 
        const otherUser = rooms[roomID][0]; 
        if (otherUser) {
          socket.to(otherUser).emit('user left', socket.id); 
        }
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
