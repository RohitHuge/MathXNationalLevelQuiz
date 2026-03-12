import pool from '../config/db.js';

// Global Round 3 State
let gameState = {
    activeSubRound: 0, // 1 to 5
    currentQuestionIndex: -1,
    activeQuestion: null,
    showAnswer: false,
    judgedOption: null,
    timerTime: 60,
    isTimerRunning: false,
    imageUrl: null,

    // UI Customization 
    clientFontSize: 60, // base font size in px
    allocatedTeamId: null, // Track which team is currently allocated to answer
    showTimer: true, // Master toggle for showing timer on Projector

    // Sub-Round 4 Specifics
    buzzerQueue: [], // Array of { teamId, timestamp }
    passCount: 0,
    buzzerLocked: true,

    // Sub-Round 5: Rapid Fire
    rapidFire: {
        active: false,
        setNumber: -1,        // Which set (1-6) is active
        questionIndex: 0,     // Current question within the set (0-9)
        questions: [],        // Full 10 questions (including correctIndex — server only)
        teamId: null,         // Which team is playing
        adminAnswers: [],     // Array of selectedOption per question index
        phase: 'idle',        // idle | playing | review
        retryQuestionIndex: null,
        retrySelectedOption: null,
        showResults: false,   // Whether to show the results modal on client
        results: null         // Calculated results payload for client
    },

    teams: [
        { id: 1, name: "Team 1", score: 0 },
        { id: 2, name: "Team 2", score: 0 },
        { id: 3, name: "Team 3", score: 0 },
        { id: 4, name: "Team 4", score: 0 },
        { id: 5, name: "Team 5", score: 0 },
        { id: 6, name: "Team 6", score: 0 }
    ]
};

// Initialize Database Column for Round 3
const initDB = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            console.error('\n[CRITICAL ERROR] DATABASE_URL is missing from backend/.env !');
            console.error('The backend cannot connect to PostgreSQL. Please create backend/.env with DATABASE_URL=postgres://...\n');
            return;
        }
        await pool.query('ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS sub_round INTEGER DEFAULT 0;');
        console.log('[Round 3] sub_round column verified in questions table.');
    } catch (err) {
        console.error('[Round 3] Error verifying sub_round column. Is the database connection valid?');
        console.error(err.message);
    }
};

initDB();

export const setupRound3Sockets = (io, socket) => {
    // --------------------------------------------------------
    // CORE SYNC & ADMIN
    // --------------------------------------------------------

    // Send state on connect
    socket.emit('server:round3:state_update', gameState);

    socket.on('admin:round3:request_state', () => {
        socket.emit('server:round3:state_update', gameState);
    });

    socket.on('client:round3:request_state', () => {
        socket.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:update_state', (newState) => {
        gameState = { ...gameState, ...newState };
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:fetch_questions', async (subRound) => {
        try {
            const res = await pool.query(
                'SELECT id, content, marks FROM public.questions WHERE round = 3 AND sub_round = $1 ORDER BY created_at ASC',
                [subRound]
            );
            socket.emit('server:round3:questions_list', res.rows);
        } catch (err) {
            console.error('[Round 3] Error fetching questions:', err);
        }
    });

    socket.on('admin:round3:push_question', async (data) => {
        const { id, subRoundNum } = data;
        try {
            const res = await pool.query('SELECT id, content, marks FROM public.questions WHERE id = $1 LIMIT 1', [id]);
            if (res.rows.length > 0) {
                const question = res.rows[0];
                gameState.activeQuestion = {
                    id: question.id,
                    text: question.content?.text || 'Question',
                    mathText: question.content?.mathText || '',
                    imageUrl: question.content?.imageUrl || null, // For visual round
                    options: question.content?.options || [],
                    correctIndex: question.content?.correctIndex
                };
                gameState.activeSubRound = subRoundNum;
                gameState.showAnswer = false;
                gameState.judgedOption = null;
                gameState.timerTime = 60;
                gameState.isTimerRunning = false;

                // Reset buzzer mechanics and allocations for the new question
                gameState.buzzerQueue = [];
                gameState.passCount = 0;
                gameState.buzzerLocked = true; // Wait for Admin to manually "Start" buzzer
                // gameState.allocatedTeamId = null; // Removed to allow pre-allocation!

                io.emit('server:round3:state_update', gameState);
            }
        } catch (err) {
            console.error('[Round 3] Error pushing question:', err);
        }
    });

    socket.on('admin:round3:hide_question', () => {
        gameState.activeQuestion = null;
        gameState.buzzerQueue = [];
        gameState.showAnswer = false;
        gameState.judgedOption = null;
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:reveal_answer', () => {
        gameState.showAnswer = true;
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:judge_option', ({ selectedIndex }) => {
        if (!gameState.activeQuestion || !Array.isArray(gameState.activeQuestion.options)) return;

        const parsedIndex = Number.parseInt(selectedIndex, 10);
        if (!Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= gameState.activeQuestion.options.length) return;

        gameState.judgedOption = {
            selectedIndex: parsedIndex,
            isCorrect: parsedIndex === gameState.activeQuestion.correctIndex
        };

        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:clear_judged_option', () => {
        gameState.judgedOption = null;
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:set_font_size', (sizeDelta) => {
        gameState.clientFontSize = Math.max(20, Math.min(150, gameState.clientFontSize + sizeDelta));
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:allocate_team', (teamId) => {
        gameState.allocatedTeamId = gameState.allocatedTeamId === teamId ? null : teamId; // Toggle allocation
        io.emit('server:round3:state_update', gameState);
    });

    // --------------------------------------------------------
    // TIMER LOGIC
    // --------------------------------------------------------
    socket.on('admin:round3:start_timer', () => {
        gameState.isTimerRunning = true;
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:pause_timer', () => {
        gameState.isTimerRunning = false;
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:set_timer', (time) => {
        gameState.timerTime = parseInt(time, 10) || 0;
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:toggle_timer_visibility', () => {
        gameState.showTimer = !gameState.showTimer;
        io.emit('server:round3:state_update', gameState);
    });

    // --------------------------------------------------------
    // BUZZER & HARDWARE LOGIC (@buzzerCode Bridge)
    // --------------------------------------------------------
    socket.on('admin:round3:unlock_buzzers', () => {
        gameState.buzzerLocked = false;
        gameState.buzzerQueue = [];
        gameState.passCount = 0;
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:lock_buzzers', () => {
        gameState.buzzerLocked = true;
        io.emit('server:round3:state_update', gameState);
    });

    // Test ping from the Local Buzzer Node
    socket.on('client:round3:test_connection', (data) => {
        console.log(`\n========================================`);
        console.log(`📡 [VPS Received Buzzer Ping]: ${data.message}`);
        console.log(`========================================\n`);
    });

    // The physical Hardware sends this exact signal
    socket.on('client:round3:buzzer_pressed', (data) => {
        console.log(`\n!!! ---> [VPS RECEIVED HARDWARE BUZZER EMIT] <--- !!!`);
        console.log(`Data Payload:`, data);
        console.log(`Current Lock State: ${gameState.buzzerLocked ? 'LOCKED (Dropping Request)' : 'UNLOCKED (Accepting)'}`);

        if (gameState.buzzerLocked) return;

        const { teamId, timestamp } = data;

        // Sub-Round 3: Block Allocated Team from queueing 
        if (gameState.activeSubRound === 3) {
            // Use loose equality (==) because teamId from hardware is Number, but allocatedTeamId might be String internally
            if (teamId == gameState.allocatedTeamId) {
                console.log(`[Round 3 SR3] Dropping hit from Allocated Team ${teamId} -> They are blocked from buzzing!`);
                return; // Do NOT push them to the buzzerQueue 
            }
        }

        // Standard Queue Entry Mechanics
        // Prevent duplicate hits from the same team in this queue
        if (!gameState.buzzerQueue.find(b => b.teamId === teamId)) {
            gameState.buzzerQueue.push({ teamId, timestamp: timestamp || Date.now() });

            // Sort to technically guarantee hardware arrival timing
            gameState.buzzerQueue.sort((a, b) => a.timestamp - b.timestamp);

            console.log(`[Round 3 Buzzer] Team ${teamId} buzzed in at Position ${gameState.buzzerQueue.length}!`);
            io.emit('server:round3:state_update', gameState);
        }
    });

    // Admin registers a wrong answer -> increment passes
    socket.on('admin:round3:pass_next', () => {
        if (gameState.buzzerQueue.length > 0 && gameState.passCount < 2) {
            gameState.passCount++;

            if (gameState.passCount >= 2 || gameState.passCount >= gameState.buzzerQueue.length) {
                // Out of chances, lock buzzers permanently for this question
                gameState.buzzerLocked = true;
            }
            io.emit('server:round3:state_update', gameState);
        }
    });

    // Admin awards points manually
    socket.on('admin:round3:award_points', (data) => {
        const { teamId, points } = data;
        const team = gameState.teams.find(t => t.id === teamId);
        if (team) {
            team.score += parseInt(points, 10);
            io.emit('server:round3:state_update', gameState);
        }
    });

    // Admin updates team names
    socket.on('admin:round3:update_team_names', (teamNames) => {
        // teamNames is expected to be an object: { 1: "Name 1", 2: "Name 2", ... }
        Object.entries(teamNames).forEach(([id, name]) => {
            const team = gameState.teams.find(t => t.id === parseInt(id, 10));
            if (team) {
                team.name = name;
            }
        });
        io.emit('server:round3:state_update', gameState);
        console.log('[Round 3] Team names updated by admin');
    });

    // --------------------------------------------------------
    // SUB-ROUND 5: RAPID FIRE
    // --------------------------------------------------------

    // Admin loads all SR5 questions grouped into sets
    socket.on('admin:round3:rf_load_sets', async () => {
        try {
            const res = await pool.query(
                `SELECT id, content, marks FROM public.questions 
                 WHERE round = 3 AND sub_round = 5 
                 ORDER BY (content->>'set')::int ASC, created_at ASC`
            );
            // Group by set number
            const grouped = {};
            for (const row of res.rows) {
                const setNum = row.content?.set || 1;
                if (!grouped[setNum]) grouped[setNum] = [];
                grouped[setNum].push(row);
            }
            // Build set summaries for admin (include full content for admin use)
            const sets = Object.entries(grouped).map(([setNum, qs]) => ({
                setNumber: parseInt(setNum, 10),
                count: qs.length,
                questions: qs // full — admin only
            }));
            socket.emit('server:round3:rf_sets_loaded', sets);
        } catch (err) {
            console.error('[Rapid Fire] Error loading sets:', err);
        }
    });

    // Admin starts rapid fire for a specific set and team
    socket.on('admin:round3:rf_start', ({ setNumber, teamId, questions }) => {
        gameState.rapidFire = {
            active: true,
            setNumber,
            questionIndex: 0,
            questions,           // Full question data with correctIndex (server holds it)
            teamId,
            adminAnswers: [],
            phase: 'playing',
            retryQuestionIndex: null,
            retrySelectedOption: null,
            showResults: false,
            results: null
        };
        gameState.activeSubRound = 5;

        // Build sanitized current question for clients (no correctIndex)
        const currentQ = questions[0];
        const { correctIndex, ...safeContent } = currentQ.content;
        gameState.activeQuestion = {
            id: currentQ.id,
            text: currentQ.content?.text,
            mathText: currentQ.content?.mathText || '',
            options: currentQ.content?.options || [],
            imageUrl: currentQ.content?.imageUrl || null
        };
        gameState.judgedOption = null;

        io.emit('server:round3:state_update', gameState);
        console.log(`[Rapid Fire] Started Set ${setNumber} for Team ${teamId}`);
    });

    // Admin logs an answer for the current rapid fire question and auto-advances
    socket.on('admin:round3:rf_answer', ({ selectedOption }) => {
        const rf = gameState.rapidFire;
        if (!rf.active || rf.phase !== 'playing') return;

        // Record the answer
        rf.adminAnswers[rf.questionIndex] = selectedOption;

        const nextIndex = rf.questionIndex + 1;

        if (nextIndex < rf.questions.length) {
            // Move to next question
            rf.questionIndex = nextIndex;
            const currentQ = rf.questions[nextIndex];
            gameState.activeQuestion = {
                id: currentQ.id,
                text: currentQ.content?.text,
                mathText: currentQ.content?.mathText || '',
                options: currentQ.content?.options || [],
                imageUrl: currentQ.content?.imageUrl || null
            };
            gameState.judgedOption = null;
        } else {
            // All questions answered — move to the review board
            rf.questionIndex = nextIndex;
            rf.phase = 'review';
            gameState.activeQuestion = null;
            gameState.judgedOption = null;
        }

        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:rf_skip', () => {
        const rf = gameState.rapidFire;
        if (!rf.active || rf.phase !== 'playing') return;

        const nextIndex = rf.questionIndex + 1;

        if (nextIndex < rf.questions.length) {
            rf.questionIndex = nextIndex;
            const currentQ = rf.questions[nextIndex];
            gameState.activeQuestion = {
                id: currentQ.id,
                text: currentQ.content?.text,
                mathText: currentQ.content?.mathText || '',
                options: currentQ.content?.options || [],
                imageUrl: currentQ.content?.imageUrl || null
            };
            gameState.judgedOption = null;
        } else {
            rf.questionIndex = nextIndex;
            rf.phase = 'review';
            gameState.activeQuestion = null;
            gameState.judgedOption = null;
        }

        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:rf_review_answer', ({ questionIndex, selectedOption }) => {
        const rf = gameState.rapidFire;
        if (!rf.active || rf.phase !== 'review') return;

        const parsedIndex = Number.parseInt(questionIndex, 10);
        if (!Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= rf.questions.length) return;

        const parsedOption = Number.parseInt(selectedOption, 10);
        const options = rf.questions[parsedIndex]?.content?.options || [];
        if (!Number.isInteger(parsedOption) || parsedOption < 0 || parsedOption >= options.length) return;

        rf.retryQuestionIndex = parsedIndex;
        rf.retrySelectedOption = parsedOption;
        gameState.activeQuestion = null;
        gameState.judgedOption = null;

        io.emit('server:round3:state_update', gameState);
    });

    // Admin calculates and broadcasts results
    socket.on('admin:round3:rf_calculate', () => {
        const rf = gameState.rapidFire;
        if (!rf.active || rf.questions.length === 0) return;

        const breakdown = rf.questions.map((q, i) => {
            const correctIndex = q.content?.correctIndex;
            const selectedOption = i === rf.retryQuestionIndex && rf.retrySelectedOption !== null
                ? rf.retrySelectedOption
                : rf.adminAnswers[i] ?? null;
            const isCorrect = selectedOption !== null && selectedOption === correctIndex;
            return {
                questionNumber: i + 1,
                text: q.content?.mathText || q.content?.text || '',
                options: q.content?.options || [],
                correctIndex,
                selectedOption,
                isCorrect,
                wasRetried: i === rf.retryQuestionIndex && rf.retrySelectedOption !== null
            };
        });

        const correctCount = breakdown.filter(b => b.isCorrect).length;
        const team = gameState.teams.find(t => t.id === rf.teamId);

        rf.results = {
            teamName: team?.name || `Team ${rf.teamId}`,
            setNumber: rf.setNumber,
            total: rf.questions.length,
            correctCount,
            breakdown,
            retryQuestionIndex: rf.retryQuestionIndex
        };
        rf.showResults = true;
        gameState.activeQuestion = null;
        gameState.judgedOption = null;

        io.emit('server:round3:state_update', gameState);
        console.log(`[Rapid Fire] Results calculated: ${correctCount}/${rf.questions.length} for Team ${rf.teamId}`);
    });

    // Admin resets rapid fire
    socket.on('admin:round3:rf_reset', () => {
        gameState.rapidFire = {
            active: false,
            setNumber: -1,
            questionIndex: 0,
            questions: [],
            teamId: null,
            adminAnswers: [],
            phase: 'idle',
            retryQuestionIndex: null,
            retrySelectedOption: null,
            showResults: false,
            results: null
        };
        gameState.activeQuestion = null;
        gameState.judgedOption = null;
        io.emit('server:round3:state_update', gameState);
    });
};

// Start the Central Server-side Tick for the Timer
let lastTick = Date.now();
export const startRound3Timer = (io) => {
    setInterval(() => {
        const now = Date.now();
        if (now - lastTick >= 1000) {
            lastTick = now;
            if (gameState.isTimerRunning && gameState.timerTime > 0) {
                gameState.timerTime--;
                io.emit('server:round3:timer_tick', gameState.timerTime);

                if (gameState.timerTime === 0) {
                    gameState.isTimerRunning = false;
                    gameState.buzzerLocked = true; // Auto-lock buzers on timer end
                    io.emit('server:round3:state_update', gameState);
                }
            }
        }
    }, 250); // Tick 4 times a second, process 1 per second for high accuracy
};
