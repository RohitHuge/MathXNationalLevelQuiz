import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { questions } from './data/questions.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

let gameState = {
    roundName: "MathX Buzzer Round",
    currentQuestionIndex: -1, // -1 means waiting to start
    activeQuestion: null,
    showAnswer: false,
    timerTime: 60, // Default 60 seconds
    isTimerRunning: false,
    showLeaderboard: false,
    isWaitingForQuestion: true,
    currentTeamFor: {
        name: "Team Alpha",
        college: "MIT",
        score: 0
    },
    teams: [
        { id: 1, name: "Team Alpha", college: "MIT", score: 0 },
        { id: 2, name: "Team Beta", college: "Stanford", score: 0 },
        { id: 3, name: "Team Gamma", college: "Harvard", score: 0 }
    ]
};

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send current state to newly connected client
    socket.emit('gameStateUpdate', gameState);
    socket.emit('allQuestions', questions);

    // Admin Events
    socket.on('adminUpdateState', (newState) => {
        gameState = { ...gameState, ...newState };
        io.emit('gameStateUpdate', gameState);
    });

    socket.on('nextQuestion', () => {
        gameState.currentQuestionIndex++;
        if (gameState.currentQuestionIndex < questions.length && gameState.currentQuestionIndex >= 0) {
            gameState.activeQuestion = questions[gameState.currentQuestionIndex];
        } else {
            gameState.activeQuestion = null; // No more questions
        }
        gameState.showAnswer = false;
        gameState.timerTime = 60;
        gameState.isTimerRunning = false;
        gameState.isWaitingForQuestion = false;
        gameState.showLeaderboard = false;
        io.emit('gameStateUpdate', gameState);
    });

    socket.on('selectQuestion', (id) => {
        const q = questions.find(qst => qst.id === id);
        if (q) {
            gameState.activeQuestion = q;
            gameState.currentQuestionIndex = questions.indexOf(q);
            gameState.showAnswer = false;
            gameState.timerTime = 60;
            gameState.isTimerRunning = false;
            gameState.isWaitingForQuestion = false;
            gameState.showLeaderboard = false;
            io.emit('gameStateUpdate', gameState);
        }
    });

    socket.on('setTimer', (time) => {
        gameState.timerTime = parseInt(time, 10) || 0;
        io.emit('gameStateUpdate', gameState);
    });

    socket.on('revealAnswer', () => {
        gameState.showAnswer = true;
        io.emit('gameStateUpdate', gameState);
    });

    socket.on('startTimer', () => {
        gameState.isTimerRunning = true;
        io.emit('gameStateUpdate', gameState);
    });

    socket.on('pauseTimer', () => {
        gameState.isTimerRunning = false;
        io.emit('gameStateUpdate', gameState);
    });

    socket.on('resetTimer', () => {
        gameState.isTimerRunning = false;
        gameState.timerTime = 60;
        io.emit('gameStateUpdate', gameState);
    });

    // Let timer tick from client and broadcast? No, better if server ticks, but for MVP client can just count down visually if synced.
    // Actually, we'll let admin client send a tick or server handle interval. 
    // Let's implement server-side tick to be safe.

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Server-side timer interval
setInterval(() => {
    if (gameState.isTimerRunning && gameState.timerTime > 0) {
        gameState.timerTime--;
        io.emit('timerUpdate', gameState.timerTime);
    } else if (gameState.timerTime === 0 && gameState.isTimerRunning) {
        gameState.isTimerRunning = false;
        io.emit('gameStateUpdate', gameState);
    }
}, 1000);

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
