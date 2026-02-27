import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import pkg from 'pg';
import dotenv from 'dotenv';
import { Client, Users, ID } from 'node-appwrite';

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json()); // Allow parsing JSON incoming HTTP requests

// Initialize Appwrite Admin SDK
const appwriteClient = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1') // Default endpoint, change if needed
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const appwriteUsers = new Users(appwriteClient);

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

// Root API Health Check
app.get('/', (req, res) => {
    res.json({ status: "MathX Backend is active and streaming!" });
});

// REST API endpoint: Testing Registration Form
app.post('/api/register', async (req, res) => {
    const { fullName, email, collegeName, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    try {
        // 1. Create User in Appwrite Auth
        console.log(`[Register] Creating Appwrite Identity for: ${email}`);
        let newAppwriteUser;
        try {
            newAppwriteUser = await appwriteUsers.create(
                ID.unique(),
                email,
                undefined, // phone
                password,
                fullName
            );
        } catch (appwriteErr) {
            console.error('[Register] Appwrite Auth Creation Failed:', appwriteErr.message);
            // Appwrite uses status codes, 409 usually means user already exists
            if (appwriteErr.code === 409) {
                return res.status(409).json({ error: 'This email is already registered in Auth.' });
            }
            return res.status(500).json({ error: 'Failed to create User Auth profile.' });
        }

        // 2. Insert User into PostgreSQL to satisfy Relational Constraints
        console.log(`[Register] Creating PostgreSQL Definition for: ${email}`);
        const query = `
            INSERT INTO public.users (full_name, email, college_name) 
            VALUES ($1, $2, $3) 
            RETURNING id, full_name, email;
        `;
        const result = await pool.query(query, [fullName, email, collegeName || null]);

        // Respond with the newly created Postgres user definition combined with Appwrite info
        res.status(201).json({
            sqlUser: result.rows[0],
            appwriteUserId: newAppwriteUser.$id
        });
    } catch (error) {
        console.error('Registration API Error:', error);

        if (error.code === '23505') { // Postgres unique_violation code
            return res.status(409).json({ error: 'This email was registered recently in the database.' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Listen for admin stage changes (Absolute routing)
    socket.on('admin:change_stage', async (data) => {
        const { round, stage, endTime } = data; // e.g. { round: 'A', stage: 2, endTime: '2026-03-01T10:00:00Z' }
        console.log(`[Admin] Changing Global State to: Round ${round}, Stage ${stage}. End Time: ${endTime || 'None'}`);

        try {
            // Update the single generic row in PostgreSQL (returns exact inserted NOW() to sync to client)
            const res = await pool.query(`
                UPDATE public.live_state 
                SET current_round = $1, current_stage = $2, timer_end = $3, updated_at = NOW()
                RETURNING current_round, current_stage, timer_end, NOW() as server_time
            `, [round || 'A', stage, endTime || null]);

            if (res.rows.length > 0) {
                const updatedState = res.rows[0];
                // Broadcast the absolute sync state to ALL connected clients
                io.emit('server:sync_state', {
                    round: updatedState.current_round,
                    stage: updatedState.current_stage,
                    timerEnd: updatedState.timer_end,
                    serverTime: updatedState.server_time
                });
            }
        } catch (err) {
            console.error('Error updating live_state:', err);
        }
    });

    // Listen for admin triggering final results calculation
    socket.on('admin:calculate_results', async () => {
        console.log('[Admin] Received command to calculate final results.');
        try {
            // 1. Update individual scores in public.users based on public.results
            console.log('  -> Calculating individual scores...');
            await pool.query(`
                UPDATE public.users u
                SET individual_score = (r.total_score#>>'{}')::integer
                FROM (
                    -- Fetch the latest submission for each user in case of multiple
                    SELECT user_id, total_score
                    FROM (
                        SELECT user_id, total_score,
                               ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY submitted_at DESC) as rn
                        FROM public.results
                    ) recent_results
                    WHERE rn = 1
                ) r
                WHERE u.id = r.user_id;
            `);
            console.log('  -> Individual scores updated.');

            // 2. Aggregate individual scores by team and update public.team
            console.log('  -> Calculating team scores...');
            await pool.query(`
                UPDATE public.team t
                SET total_score = agg.combined_score
                FROM (
                    SELECT team_id, SUM(individual_score) as combined_score
                    FROM public.users
                    WHERE team_id IS NOT NULL
                    GROUP BY team_id
                ) agg
                WHERE t.id = agg.team_id;
            `);
            console.log('  -> Team scores updated.');

            // Respond success back to the caller
            socket.emit('server:results_calculated', { success: true });

            // Optionally tell everyone leaderboard changed
            io.emit('leaderboard:update');

        } catch (err) {
            console.error('Error calculating final results:', err);
            socket.emit('server:results_calculated', { success: false, error: err.message });
        }
    });

    // Client requests current state (e.g. on page mount or refresh)
    socket.on('client:request_state', async () => {
        try {
            const res = await pool.query('SELECT current_round, current_stage, timer_end, NOW() as server_time FROM public.live_state LIMIT 1');
            if (res.rows.length > 0) {
                const { current_round, current_stage, timer_end, server_time } = res.rows[0];
                // Send standard format ONLY to the requesting client
                socket.emit('server:sync_state', {
                    round: current_round,
                    stage: current_stage,
                    timerEnd: timer_end,
                    serverTime: server_time
                });
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
        const { email, answers } = data; // answers map: { question_id: selected_option_index }

        if (!email) {
            console.error('Submit Exam failed: Missing User Email');
            return;
        }

        try {
            console.log(`[Grading] Evaluating exam for user email: ${email}`);

            // 1. Resolve Postgres UUID from the synced email
            const userRes = await pool.query('SELECT id FROM public.users WHERE email = $1 LIMIT 1', [email]);
            if (userRes.rows.length === 0) {
                console.error(`User email ${email} not found in Postgres. Was the sync script run?`);
                return; // Abort if user doesn't exist in the SQL database
            }
            const userId = userRes.rows[0].id;
            console.log(`[Grading] Resolved Postgres UUID: ${userId}`);

            // Fetch all answers mapped
            const res = await pool.query('SELECT id, content, marks FROM public.questions');
            const truthMap = res.rows.reduce((acc, row) => {
                acc[row.id] = {
                    correctIndex: row.content?.correctIndex,
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

                // Guard against null/invalid indices if it's an integer type (though our frontend only sends MCQ right now)
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
            `, [userId, totalScoreEarned]);

            console.log(`[Grading Complete] SQL User UUID: ${userId} | Score: ${totalScoreEarned}`);

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
