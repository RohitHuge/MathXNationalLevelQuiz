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
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));
app.use(express.json()); // Allow parsing JSON incoming HTTP requests

// Root API Health Check
app.get('/', (req, res) => {
    res.json({ status: "MathX Backend is active and streaming!" });
});

app.get('/health', (req, res) => {
    console.log(`[Network Test] Received a health check ping from ${req.ip}`);
    res.json({
        status: "success",
        message: "MathX Backend is perfectly reachable on the local network!",
        timestamp: new Date().toISOString()
    });
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

// ── DEV ONLY: Sound Test Routes (no DB needed) ──────────────────────────────
app.get('/test/inject-question', (req, res) => {
    const subRound = parseInt(req.query.sr) || 1;
    io.emit('server:round3:state_update', {
        activeSubRound: subRound,
        activeQuestion: {
            id: Date.now(), // unique id each call so sound re-triggers
            text: 'Test Question: What is 2 + 2?',
            mathText: 'Test: $2 + 2 = ?$',
            options: ['2', '3', '4', '5'],
            correctIndex: 2
        },
        showAnswer: false, judgedOption: null,
        timerTime: 60, isTimerRunning: false, showTimer: true,
        buzzerLocked: true, buzzerQueue: [], passCount: 0,
        allocatedTeamId: null, clientFontSize: 60,
        teams: [1, 2, 3, 4, 5, 6].map(i => ({ id: i, name: `Team ${i}`, score: 0 })),
        rapidFire: { active: false, phase: 'idle', questions: [], adminAnswers: [], reviewAnswers: [], showResults: false }
    });
    res.json({ ok: true, message: `Fake question injected for SR${subRound}. Sound should play on client!` });
});

app.get('/test/start-timer', (req, res) => {
    const seconds = parseInt(req.query.t) || 12;
    io.emit('server:round3:state_update', { timerTime: seconds, isTimerRunning: true });
    res.json({ ok: true, message: `Timer started at ${seconds}s. Timer sound plays at 10s!` });
});

// Boot Application
const PORT = 3001;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`MathX Control Backend running on port ${PORT}`);
});
