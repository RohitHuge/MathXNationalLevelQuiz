import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST']
    }
});

const prisma = new PrismaClient();

// State for the current active question
let activeQuestion = null;

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Determine if client is admin or regular
    const isAdmin = socket.handshake.query.isAdmin === 'true';

    if (isAdmin) {
        socket.join('admins');
    } else {
        // Normal client setup
        // You could require standard auth, but for simple MVP we just use socket ID or simple name
        const clientName = socket.handshake.query.name || `Team-${socket.id.substring(0, 4)}`;

        // Register client in DB
        prisma.client.upsert({
            where: { name: clientName },
            update: {},
            create: { name: clientName, id: socket.id } // Using socket id as client id for simplicity in this session
        }).catch(console.error);

        // Send current active question if any
        if (activeQuestion) {
            socket.emit('question:active', activeQuestion);
        }
    }

    // Admin event: Send new question
    socket.on('admin:send_question', async (questionData) => {
        if (!isAdmin) return;

        // questionData could be the ID of a question
        try {
            activeQuestion = await prisma.question.findUnique({
                where: { id: questionData.id }
            });

            // Fallback if the requested DB id doesn't exist
            if (!activeQuestion) {
                console.log(`Question ${questionData.id} not found, falling back to first available query.`);
                activeQuestion = await prisma.question.findFirst();
            }

            if (activeQuestion) {
                console.log(`Broadcasting question ${activeQuestion.id} to all clients`);
                // Broadcast to all clients
                io.emit('question:active', activeQuestion);
                // Reset leaderboard for this question
                io.to('admins').emit('leaderboard:update', { questionId: activeQuestion.id, answers: [] });
            } else {
                console.error('No questions found in the database to send!');
            }
        } catch (e) {
            console.error('Error in admin:send_question:', e);
        }
    });

    // Client event: Submit answer
    socket.on('client:submit_answer', async (data) => {
        // data: { questionId, numericAnswer, timeTaken }
        try {
            if (!activeQuestion || activeQuestion.id !== data.questionId) return;

            const client = await prisma.client.findFirst({
                where: { id: socket.id }
            });

            if (!client) return;

            // Allow a small epsilon for floating point issues if necessary, or strict equality
            const parsedAns = parseFloat(data.numericAnswer);
            const isCorrect = Math.abs(parsedAns - activeQuestion.correctAnswer) < 0.0001;

            const answer = await prisma.answer.create({
                data: {
                    clientId: client.id,
                    questionId: data.questionId,
                    numericAnswer: parsedAns,
                    timeTaken: data.timeTaken,
                    isCorrect
                },
                include: {
                    client: true
                }
            });

            // Update admin leaderboard
            const allAnswers = await prisma.answer.findMany({
                where: { questionId: data.questionId },
                include: { client: true },
                orderBy: [
                    { timeTaken: 'asc' }
                ]
            });

            io.to('admins').emit('leaderboard:update', {
                questionId: data.questionId,
                answers: allAnswers
            });

        } catch (e) {
            console.error('Error submitting answer:', e);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
