import pool from '../config/db.js';
import { setupRound3Sockets, startRound3Timer } from './round3Controller.js';

let activeRound2Question = null;
let round2Leaderboard = [];
let isRound2WinnerFound = false;

const setupSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        // --- ROUND 2: FASTEST FINGER FIRST ---

        // Client requests the current active Round 2 state (for mid-game reconnects)
        socket.on('client:round2:request_state', () => {
            if (activeRound2Question) {
                // If there's an active question, tell this specific reconnecting socket
                socket.emit('question:active', activeRound2Question);
                // Also send them the current leaderboard feed so they see prior attempts
                socket.emit('leaderboard:update', { answers: round2Leaderboard, winnerFound: isRound2WinnerFound });
            }
        });

        // Admin requests the bank of Round 2 questions
        socket.on('admin:round2:fetch_questions', async () => {
            try {
                // Assuming you ran the ALTER TABLE public.questions ADD COLUMN round INTEGER DEFAULT 1;
                // Fetching ONLY round 2 questions for FastFingers module
                const res = await pool.query('SELECT id, content, marks FROM public.questions WHERE round = 2 ORDER BY created_at ASC');
                socket.emit('server:round2:questions_list', res.rows);
            } catch (err) {
                console.error('[Round 2] Error fetching round 2 questions:', err);
            }
        });

        // Admin pushes a specific Integer question live
        socket.on('admin:round2:push_question', async (data) => {
            const { id } = data; // specific question id
            try {
                // Fetch the requested question from DB
                const res = await pool.query('SELECT id, content, marks FROM public.questions WHERE id = $1 LIMIT 1', [id]);
                if (res.rows.length > 0) {
                    const question = res.rows[0];

                    // Reset State for the new question
                    activeRound2Question = {
                        id: question.id,
                        text: question.content?.text || 'Integer Question',
                        mathText: question.content?.mathText || '',
                        correctInteger: question.content?.correctInteger // NOTE: We securely hold this server-side!
                    };
                    round2Leaderboard = [];
                    isRound2WinnerFound = false;

                    console.log(`[Round 2] Admin pushed question: ${activeRound2Question.text}`);

                    // Broadcast safe payload to all clients (excluding correct answer)
                    io.emit('question:active', {
                        id: activeRound2Question.id,
                        text: activeRound2Question.text,
                        mathText: activeRound2Question.mathText
                    });

                    // Clear the leaderboard for Admins
                    io.emit('leaderboard:update', { answers: [], winnerFound: false });
                }
            } catch (err) {
                console.error('[Round 2] Error pushing question:', err);
            }
        });

        // Admin hides the active question, returning clients to Waiting Screen
        socket.on('admin:round2:hide_question', () => {
            console.log('[Round 2] Admin hid the active question.');
            activeRound2Question = null;
            round2Leaderboard = [];
            isRound2WinnerFound = false;
            // Broadcast hide event so clients blank out their inputs
            io.emit('server:round2:question_hidden');
            io.emit('leaderboard:update', { answers: [], winnerFound: false });
        });

        // Client Submits an Integer Answer
        socket.on('client:submit_answer', (data) => {
            const { questionId, numericAnswer, timeTaken, clientName } = data;

            // Failsafe: if the question isn't active or round is already over
            if (!activeRound2Question || activeRound2Question.id !== questionId) {
                return socket.emit('server:round2:error', { message: 'This question is no longer active.' });
            }
            if (isRound2WinnerFound) {
                return socket.emit('server:round2:error', { message: 'A winner for this question has already been found!' });
            }

            console.log(`[Round 2] Attempt: ${clientName} guessed ${numericAnswer}`);

            // Evaluate standard integer (ensure strict equality natively)
            const isCorrect = parseFloat(numericAnswer) === parseFloat(activeRound2Question.correctInteger);

            // Log the attempt
            const attemptRecord = {
                id: socket.id, // Using socket id as temporary unique row identifier in UI
                client: { name: clientName || `Team-${socket.id.substring(0, 4)}` },
                numericAnswer: numericAnswer,
                timeTaken: parseFloat(timeTaken).toFixed(2),
                isCorrect: isCorrect,
                timestamp: Date.now()
            };

            // Push to top of leaderboard array
            round2Leaderboard.unshift(attemptRecord);

            if (isCorrect) {
                console.log(`[Round 2] 🏆 WINNER FOUND: ${clientName}`);
                isRound2WinnerFound = true;

                // Blast the winner event globally, instructing all clients to Lock their inputs and show the Winner graphic
                io.emit('server:round2:winner_found', {
                    winnerName: attemptRecord.client.name,
                    winningAnswer: activeRound2Question.correctInteger,
                    timeTaken: attemptRecord.timeTaken,
                    questionId: questionId
                });
            } else {
                // If wrong, tell the specifically wrong client to Unlock so they can try again
                socket.emit('server:round2:attempt_rejected', {
                    message: 'Incorrect answer. Try again!'
                });

                // But still tell EVERYONE (especially Admin) that someone just made an attempt
                io.emit('server:round2:attempt_logged', {
                    attempt: attemptRecord
                });
            }

            // Always update the overarching Admin Leaderboard view
            io.emit('leaderboard:update', { answers: round2Leaderboard, winnerFound: isRound2WinnerFound });
        });

        // --- END ROUND 2 ---

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

        // --- ROUND 3 INITIALIZATION ---
        setupRound3Sockets(io, socket);

        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
        });
    });

    // Start global Round 3 timer
    startRound3Timer(io);
};

export default setupSockets;
