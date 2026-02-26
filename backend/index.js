import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // allow frontend access
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Listen for admin stage changes
    socket.on('admin:change_stage', (data) => {
        console.log(`[Admin] Changing stage to: ${data.stage}`);
        // Broadcast to all clients
        io.emit('stage:change', data);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`MathX Control Backend running on port ${PORT}`);
});
