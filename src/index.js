import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";  

const app = express();
const server = http.createServer(app);


app.use(cors({
  origin: process.env.FRONTEND_URL1, 
  methods: ["GET", "POST"]
}));

const io = new Server(server, {
  cors: {
    origin:process.env.FRONTEND_URL1,  
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("send-url", (data) => {
    console.log("Received URL from frontend:", data.url);
    socket.broadcast.emit("receive-url", data.url);  
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
