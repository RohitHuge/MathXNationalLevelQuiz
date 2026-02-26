import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json()); // Allow parsing JSON incoming HTTP requests

// Determine Postgres Pool connection string natively via process.env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // allow frontend access
        methods: ["GET", "POST"]
    }
});

// REST API endpoint: Testing Registration Form
app.post('/api/register', async (req, res) => {
    const { fullName, email, collegeName } = req.body;

    if (!fullName || !email) {
        return res.status(400).json({ error: 'Full name and email are required.' });
    }

    try {
        const query = `
            INSERT INTO public.users (full_name, email, college_name) 
            VALUES ($1, $2, $3) 
            RETURNING id, full_name, email;
        `;
        const result = await pool.query(query, [fullName, email, collegeName || null]);

        // Respond with the newly created Postgres user definition
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Registration API Error:', error);
        if (error.code === '23505') { // Postgres unique_violation code
            return res.status(409).json({ error: 'This email is already registered.' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Listen for admin stage changes (Absolute routing)
    socket.on('admin:change_stage', async (data) => {
        const { round, stage } = data; // e.g. { round: 'A', stage: 2 }
        console.log(`[Admin] Changing Global State to: Round ${round}, Stage ${stage}`);

        try {
            // Update the single generic row in PostgreSQL
            await pool.query(`
                UPDATE public.live_state 
                SET current_round = $1, current_stage = $2, updated_at = NOW()
            `, [round || 'A', stage]);

            // Broadcast the absolute sync state to ALL connected clients
            io.emit('server:sync_state', { round: round || 'A', stage });
        } catch (err) {
            console.error('Error updating live_state:', err);
        }
    });

    // Client requests current state (e.g. on page mount or refresh)
    socket.on('client:request_state', async () => {
        try {
            const res = await pool.query('SELECT current_round, current_stage FROM public.live_state LIMIT 1');
            if (res.rows.length > 0) {
                const { current_round, current_stage } = res.rows[0];
                // Send standard format ONLY to the requesting client
                socket.emit('server:sync_state', { round: current_round, stage: current_stage });
            }
        } catch (err) {
            console.error('Error fetching live_state:', err);
        }
    });

    // Client requests all questions upon entering Quiz Arena
    socket.on('client:fetch_all_questions', async () => {
        try {
            // Fetch active questions explicitly referencing public.questions
            const res = await pool.query('SELECT id, content, marks FROM public.questions ORDER BY created_at ASC');

            // Sanitize: remove correctIndex so clients can't cheat by reading the network tab payload
            const sanitizedQuestions = res.rows.map(row => {
                const { correctIndex, ...safeContent } = row.content;
                return {
                    id: row.id,
                    marks: row.marks,
                    content: safeContent
                };
            });

            // Send back exclusively to the requesting client
            socket.emit('server:all_questions', sanitizedQuestions);
        } catch (err) {
            console.error('Error fetching questions:', err);
        }
    });

    // Client submits the entire exam mass payload
    socket.on('client:submit_exam', async (data) => {
        const { userId, answers } = data; // answers map: { question_id: selected_option_index }

        if (!userId) {
            console.error('Submit Exam failed: Missing User ID');
            return;
        }

        try {
            console.log(`[Grading] Evaluating exam for user: ${userId}`);

            // Fetch all answers mapped
            const res = await pool.query('SELECT id, content, marks FROM public.questions');
            const truthMap = res.rows.reduce((acc, row) => {
                acc[row.id] = {
                    correctIndex: row.content.correctIndex,
                    marks: row.marks || 10 // default 10 points if undefined
                };
                return acc;
            }, {});

            let totalScoreEarned = 0;
            const detailedScoreLog = {};
            const responsePromises = [];

            // Score individual questions against truth
            for (const [qId, selectedIndex] of Object.entries(answers)) {
                const truth = truthMap[qId];
                if (!truth) continue; // safety against deleted questions

                const isCorrect = (selectedIndex === truth.correctIndex);

                if (isCorrect) {
                    totalScoreEarned += truth.marks;
                    detailedScoreLog[qId] = truth.marks; // Log points gained
                } else {
                    detailedScoreLog[qId] = 0; // Missed
                }

                // Prepare individual response rows for public.responses
                const insertResponse = pool.query(`
                    INSERT INTO public.responses (user_id, question_id, selected_option, is_correct, answered_at)
                    VALUES ($1, $2, $3, $4, NOW())
                `, [userId, qId, selectedIndex.toString(), isCorrect]);

                responsePromises.push(insertResponse);
            }

            // Await writing all response logs simultaneously
            await Promise.all(responsePromises);

            // Log final aggregated score to public.results
            await pool.query(`
                INSERT INTO public.results (user_id, total_score, submitted_at)
                VALUES ($1, $2, NOW())
            `, [userId, detailedScoreLog]);

            console.log(`[Grading Complete] User: ${userId} | Score: ${totalScoreEarned}`);

            // Broadcast leaderboard refresh to Admin Portal dynamically
            io.emit('leaderboard:update');

        } catch (err) {
            console.error('Error grading exam:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`MathX Control Backend running on port ${PORT}`);
});
