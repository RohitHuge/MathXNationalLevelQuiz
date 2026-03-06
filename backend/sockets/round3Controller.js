import pool from '../config/db.js';

// Global Round 3 State
let gameState = {
    activeSubRound: 0, // 1 to 5
    currentQuestionIndex: -1,
    activeQuestion: null,
    showAnswer: false,
    timerTime: 60,
    isTimerRunning: false,
    imageUrl: null,

    // UI Customization 
    clientFontSize: 60, // base font size in px
    allocatedTeamId: null, // Track which team is currently allocated to answer

    // Sub-Round 4 Specifics
    buzzerQueue: [], // Array of { teamId, timestamp }
    passCount: 0,
    buzzerLocked: true,

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
                gameState.timerTime = 60;
                gameState.isTimerRunning = false;

                // Reset buzzer mechanics and allocations for the new question
                gameState.buzzerQueue = [];
                gameState.passCount = 0;
                gameState.buzzerLocked = true; // Wait for Admin to manually "Start" buzzer
                gameState.allocatedTeamId = null; // Reset allocation for new questions

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
        io.emit('server:round3:state_update', gameState);
    });

    socket.on('admin:round3:reveal_answer', () => {
        gameState.showAnswer = true;
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
        if (gameState.buzzerLocked) return;

        const { teamId, timestamp } = data;

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
