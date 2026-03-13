import pool from '../config/db.js';
import { setupRound3Sockets, startRound3Timer } from './round3Controller.js';
import { setupPointTableSockets } from './pointTableController.js';

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
                    RETURNING current_round, current_stage, timer_end, show_profile, NOW() as server_time
                `, [round || 'A', stage, endTime || null]);

                if (res.rows.length > 0) {
                    const updatedState = res.rows[0];
                    // Broadcast the absolute sync state to ALL connected clients
                    io.emit('server:sync_state', {
                        round: updatedState.current_round,
                        stage: updatedState.current_stage,
                        timerEnd: updatedState.timer_end,
                        serverTime: updatedState.server_time,
                        showProfile: updatedState.show_profile
                    });
                }
            } catch (err) {
                console.error('Error updating live_state:', err);
            }
        });

        // Anti-Cheat Reporting
        socket.on('client:cheat_detected', (data) => {
            const { teamName, type, warningCount } = data;
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[Anti-Cheat] Violation from ${teamName}: ${type} (Warning #${warningCount}) at ${timestamp}`);

            // Broadcast to all admins
            io.emit('server:cheat_alert', {
                teamName,
                type,
                warningCount,
                timestamp
            });
        });

        // Toggle Profile Visibility on Dashboard
        socket.on('admin:toggle_profile_visibility', async (data) => {
            const { showProfile } = data;
            console.log(`[Admin] Toggling Profile Visibility to: ${showProfile}`);

            try {
                const res = await pool.query(`
                    UPDATE public.live_state 
                    SET show_profile = $1, updated_at = NOW()
                    RETURNING current_round, current_stage, timer_end, show_profile, NOW() as server_time
                `, [showProfile]);

                if (res.rows.length > 0) {
                    const updatedState = res.rows[0];
                    io.emit('server:sync_state', {
                        round: updatedState.current_round,
                        stage: updatedState.current_stage,
                        timerEnd: updatedState.timer_end,
                        serverTime: updatedState.server_time,
                        showProfile: updatedState.show_profile
                    });
                }
            } catch (err) {
                console.error('Error toggling profile visibility:', err);
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
                const res = await pool.query('SELECT current_round, current_stage, timer_end, show_profile, NOW() as server_time FROM public.live_state LIMIT 1');
                if (res.rows.length > 0) {
                    const { current_round, current_stage, timer_end, server_time } = res.rows[0];
                    // Send standard format ONLY to the requesting client
                    socket.emit('server:sync_state', {
                        round: current_round,
                        stage: current_stage,
                        timerEnd: timer_end,
                        serverTime: server_time,
                        showProfile: res.rows[0].show_profile
                    });
                }
            } catch (err) {
                console.error('Error fetching live_state:', err);
            }
        });

        // Fetch SQL-backed profile data for the authenticated Appwrite user.
        socket.on('client:get_profile', async ({ id }, callback) => {
            if (!id) {
                if (typeof callback === 'function') {
                    callback({ ok: false, error: 'User ID is required.' });
                }
                return;
            }

            try {
                const query = `
                    SELECT u.id, u.full_name, u.email, u.college_name, t.team_name, u.is_leader
                    FROM public.users u
                    LEFT JOIN public.team t ON u.team_id = t.id
                    WHERE u.id = $1
                    LIMIT 1;
                `;
                const result = await pool.query(query, [id]);

                if (result.rows.length === 0) {
                    if (typeof callback === 'function') {
                        callback({ ok: false, error: 'User not found.' });
                    }
                    return;
                }

                if (typeof callback === 'function') {
                    callback({ ok: true, profile: result.rows[0] });
                }
            } catch (err) {
                console.error('Socket profile fetch error:', err);
                if (typeof callback === 'function') {
                    callback({ ok: false, error: 'Internal Server Error' });
                }
            }
        });

        // Client requests all questions upon entering Quiz Arena
        socket.on('client:fetch_all_questions', async () => {
            try {
                // Fetch active questions explicitly referencing public.questions and only round 1
                const res = await pool.query('SELECT id, content, marks FROM public.questions WHERE round = 1 ORDER BY created_at ASC');

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

        // --- INCREMENTAL SAVE & NEXT ARCHITECTURE ---

        // 1. Initialize Session
        socket.on('client:start_quiz', async ({ email }) => {
            if (!email) return;
            try {
                const userRes = await pool.query('SELECT id FROM public.users WHERE email = $1 LIMIT 1', [email]);
                if (userRes.rows.length === 0) return;
                const userId = userRes.rows[0].id;

                // Check existing session status
                const sessionRes = await pool.query(`SELECT status FROM public.sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [userId]);

                let currentStatus = 'new';
                if (sessionRes.rows.length > 0) {
                    currentStatus = sessionRes.rows[0].status;
                }

                if (currentStatus === 'submitted') {
                    // Fetch attempted count
                    const responseCountRes = await pool.query(`
                        SELECT COUNT(*) AS attempted
                        FROM public.responses
                        WHERE user_id = $1 AND selected_option <> '-1'
                    `, [userId]);
                    const attemptedCount = parseInt(responseCountRes.rows[0].attempted, 10);

                    socket.emit('server:session_status', { status: 'submitted', attemptedCount });
                    return;
                }

                // Create or return active session
                await pool.query(`
                    INSERT INTO public.sessions (user_id)
                    SELECT $1::varchar
                    WHERE NOT EXISTS (
                        SELECT 1 FROM public.sessions WHERE user_id = $1 AND status = 'active'
                    )
                `, [userId]);

                socket.emit('server:session_status', { status: 'active' });
                console.log(`[Quiz Session] Started for user: ${userId}`);
            } catch (err) {
                console.error('Error starting quiz session:', err);
            }
        });

        // 2. Load existing answers for returning users
        socket.on('client:load_answers', async ({ email }) => {
            if (!email) return;
            try {
                const userRes = await pool.query('SELECT id FROM public.users WHERE email = $1 LIMIT 1', [email]);
                if (userRes.rows.length === 0) return;
                const userId = userRes.rows[0].id;

                const res = await pool.query('SELECT question_id, selected_option FROM public.responses WHERE user_id = $1', [userId]);
                const loadedAnswers = {};
                res.rows.forEach(row => {
                    loadedAnswers[row.question_id] = parseInt(row.selected_option, 10);
                });

                // Emit specifically to the requesting socket
                socket.emit('server:answers_loaded', loadedAnswers);
            } catch (err) {
                console.error('Error loading answers:', err);
            }
        });

        // 3. Incrementally save an answer
        socket.on('client:save_answer', async ({ email, questionId, selectedOption }) => {
            if (!email || !questionId || selectedOption === undefined) return;
            try {
                const userRes = await pool.query('SELECT id FROM public.users WHERE email = $1 LIMIT 1', [email]);
                if (userRes.rows.length === 0) return;
                const userId = userRes.rows[0].id;

                // Evaluate correctness vs the server truth
                const qRes = await pool.query('SELECT content FROM public.questions WHERE id = $1 LIMIT 1', [questionId]);
                if (qRes.rows.length === 0) return;

                const truthIndex = qRes.rows[0].content?.correctIndex;
                const isCorrect = (parseInt(selectedOption, 10) === truthIndex);

                // UPSERT answer into public.responses
                await pool.query(`
                    INSERT INTO public.responses (user_id, question_id, selected_option, is_correct, answered_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (user_id, question_id) 
                    DO UPDATE SET 
                        selected_option = EXCLUDED.selected_option,
                        is_correct = EXCLUDED.is_correct,
                        answered_at = NOW()
                `, [userId, questionId, selectedOption.toString(), isCorrect]);

                // Tell the client that the save was successful so it can reload truth
                socket.emit('server:answer_saved', { questionId });

            } catch (err) {
                console.error('[Incremental Save] Error:', err);
            }
        });

        // 4. Submit Exam (Calculated server-side from incremental saves)
        socket.on('client:submit_exam', async (data) => {
            const { email } = data; // No bulk answers payload anymore

            if (!email) {
                console.error('Submit Exam failed: Missing User Email');
                return;
            }

            try {
                console.log(`[Grading] Submitting exam for user email: ${email}`);

                const userRes = await pool.query('SELECT id FROM public.users WHERE email = $1 LIMIT 1', [email]);
                if (userRes.rows.length === 0) {
                    console.error(`User email ${email} not found in Postgres.`);
                    return;
                }
                const userId = userRes.rows[0].id;

                // Mark session as submitted
                await pool.query(`
                    UPDATE public.sessions 
                    SET submitted_at = NOW(), status = 'submitted' 
                    WHERE user_id = $1 AND status = 'active'
                `, [userId]);

                // Calculate final score purely from public.responses joined with public.questions
                const scoreRes = await pool.query(`
                    SELECT COALESCE(SUM(q.marks), 0) AS total_score
                    FROM public.responses r
                    JOIN public.questions q ON r.question_id = q.id
                    WHERE r.user_id = $1 AND r.is_correct = true
                `, [userId]);

                const totalScoreEarned = parseInt(scoreRes.rows[0].total_score, 10);

                const attemptedCountRes = await pool.query(`
                    SELECT COUNT(*) AS attempted
                    FROM public.responses
                    WHERE user_id = $1 AND selected_option <> '-1'
                `, [userId]);
                const attemptedCount = parseInt(attemptedCountRes.rows[0].attempted, 10);

                // Insert final score record
                await pool.query(`
                    INSERT INTO public.results (user_id, total_score, submitted_at)
                    VALUES ($1, $2, NOW())
                `, [userId, totalScoreEarned]);

                console.log(`[Grading Complete] SQL User UUID: ${userId} | Score: ${totalScoreEarned}`);

                socket.emit('server:session_status', { status: 'submitted', attemptedCount });

                // Broadcast leaderboard refresh
                io.emit('leaderboard:update');

            } catch (err) {
                console.error('Error submitting exam:', err);
            }
        });

        // --- ROUND 3 INITIALIZATION ---
        setupRound3Sockets(io, socket);
        setupPointTableSockets(io, socket);

        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
        });
    });

    // Start global Round 3 timer
    startRound3Timer(io);
};

export default setupSockets;
