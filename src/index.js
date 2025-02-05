// ---------------------- SERVER SIDE (Express + Socket.io) ----------------------
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

app.use(cors({
    origin: ['http://localhost:5173/'],
    methods: ['GET', 'POST'],
    credentials: true,
}));

const server = createServer(app);
const io = new Server(server, { cors: true });



io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join-room',({roomId,id})=>{
        console.log(roomId,id)
    socket.join(roomId)
    socket.to(roomId).emit('user-connected',roomId)

})
    
})

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
