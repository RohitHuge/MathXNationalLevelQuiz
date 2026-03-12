# MathX National Level Quiz

A real-time, multi-round quiz platform built for MathX, featuring WebSocket-driven live question control, a physical Arduino buzzer system, and a virtual buzzer interface.

---

## Project Structure

```
MathXNationalLevelQuiz-dev/
├── backend/              # Main Node.js + Express + Socket.IO server (port 3001)
├── frontend/             # React + Vite frontend (port 5173)
│   └── public/
│       └── sounds/       # All game sound effects
│           ├── buzzer_sound.mp3      # Plays on buzzer press
│           ├── question_display.mp3  # Plays when a new question appears
│           └── timer.mp3             # Plays when timer hits 10 seconds
├── BuzzerCode/
│   ├── backend/          # Local Node.js bridge between Arduino and main backend (port 5000)
│   └── frontend/         # Virtual buzzer UI for testing without Arduino (port 5174)
│       └── public/
│           └── sounds/
│               └── buzzer_sound.mp3  # Local copy for immediate playback
└── docker-compose.yml
```

---

## Running Locally

Start all four services in separate terminals:

```bash
# 1. Main Backend
cd backend && npm run dev

# 2. Main Frontend
cd frontend && npm run dev

# 3. BuzzerCode Backend (Arduino bridge)
cd BuzzerCode/backend && npm run dev

# 4. BuzzerCode Frontend (Virtual buzzer UI)
cd BuzzerCode/frontend && npm run dev
```

| Service | URL |
|---|---|
| Round 3 Client (projector) | http://localhost:5173/round3/client |
| Round 3 Admin | http://localhost:5173/round3/admin |
| Virtual Buzzer UI | http://localhost:5174 |
| Backend API | http://localhost:3001 |

---

## Sound System (Round 3)

All sound logic lives in `frontend/src/round3/Round3Client.jsx`.

### How It Works

The client page holds three `Audio` refs that are triggered by React `useEffect` hooks watching the game state:

| Sound File | Trigger | Condition |
|---|---|---|
| `buzzer_sound.mp3` | `server:round3:buzzer_hit` socket event | Any time a team presses the buzzer |
| `question_display.mp3` | `activeQuestion.id` changes | New question pushed by admin (SR 1–4 only, not SR5 Rapid Fire) |
| `timer.mp3` | `timerTime` drops to `10` | Timer is running and just crossed the 10-second mark |

### Key Implementation Details

**Buzzer Sound Fix (backend)**
- File: `backend/sockets/round3Controller.js`
- The `server:round3:buzzer_hit` socket event is now emitted **before** the `buzzerLocked` guard.
- Previously, if buzzers were locked (the default state), the backend returned early and never sent the event — so no sound played.
- Now: sound always fires on any buzz, the lock only blocks the buzzer queue entry.

**Question Display Sound**
- Uses a `prevQuestionId` ref to detect when a genuinely new question appears.
- Skips Sub-Round 5 (Rapid Fire) entirely since it has its own rapid-question flow.

**Timer Warning Sound**
- Uses a `timerSoundPlayed` boolean ref as a one-shot guard — plays exactly once per countdown.
- Resets automatically when `timerTime` goes above 10, ready for the next question.

**Virtual Buzzer (BuzzerCode/frontend)**
- Sound plays **immediately on button click**, independently of the socket chain, for instant feedback.
- The `buzzer_sound.mp3` is copied into `BuzzerCode/frontend/public/sounds/`.

### Testing Sounds Without a Database

Use these HTTP endpoints (no DB required):

```bash
# Inject a fake question → triggers question_display.mp3
GET http://localhost:3001/test/inject-question

# Start timer at 12 seconds → timer.mp3 plays at 10s
GET http://localhost:3001/test/start-timer
```

---

## Hardware (Arduino) Buzzer

- The `BuzzerCode/backend` reads serial data from the Arduino on the configured COM port.
- Each button press from the Arduino sends `client:round3:buzzer_pressed` to the main backend via Socket.IO.
- The main backend processes it identically to a virtual buzz — the sound chain is the same.
- Configure the COM port in `BuzzerCode/backend/.env`: `ARDUINO_COM_PORT=COM11`

---

## Environment Variables

Create `.env` files (these are gitignored):

**`backend/.env`**
```
DATABASE_URL=postgres://user:password@host:5432/dbname
```

**`BuzzerCode/backend/.env`** (optional overrides)
```
ARDUINO_COM_PORT=COM11
```
