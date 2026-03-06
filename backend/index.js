import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

// Import configurations and architectural modules
import './config/db.js'; // Ensure database pool initializes
import authRoutes from './routes/authRoutes.js';
import setupSockets from './sockets/index.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Allow parsing JSON incoming HTTP requests

// Root API Health Check
app.get('/', (req, res) => {
    res.json({ status: "MathX Backend is active and streaming!" });
});

// REST API Endpoints
import round2Routes from './round2/round2Routes.js';
app.use('/api', authRoutes);
app.use('/api/round2', round2Routes);

// Socket & HTTP Server Setup
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow frontend access
        methods: ["GET", "POST"]
    }
});

// Attach Socket Listeners
setupSockets(io);

// Boot Application
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`MathX Control Backend running on port ${PORT}`);
});
