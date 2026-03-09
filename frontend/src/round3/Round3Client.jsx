import React, { useEffect, useState } from 'react';
import { useSocket } from '../SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Trophy, Clock, Zap, Lock, Unlock, AlertTriangle, Minus, Plus } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

const HorizontalTimer = ({ time, maxTime = 60 }) => {
    const clampedTime = Math.max(0, Math.min(time, maxTime));
    const percentage = (clampedTime / maxTime) * 100;
    const isCritical = clampedTime <= 10;

    return (
        <div className="w-full relative h-4 bg-white/10 rounded-full overflow-hidden mb-6 shadow-inner">
            <motion.div
                initial={{ width: "100%" }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                className={`h-full rounded-full ${isCritical ? 'bg-[var(--color-neon-pink)] shadow-[0_0_15px_rgba(255,0,255,0.8)]' : 'bg-[var(--color-neon-cyan)] shadow-[0_0_15px_rgba(0,255,255,0.8)]'}`}
            />
        </div>
    );
};

export function Round3Client() {
    const { socket, isConnected } = useSocket();
    const [gameState, setGameState] = useState(null);
    const [localFontVh, setLocalFontVh] = useState(2.5); // Default font size in vh units

    useEffect(() => {
        if (!socket) return;

        socket.on('server:round3:state_update', (state) => {
            setGameState(state);
        });

        socket.on('server:round3:timer_tick', (time) => {
            setGameState(prev => prev ? { ...prev, timerTime: time } : prev);
        });

        // Force a state pull in case the frontend missed the connection broadcast
        socket.emit('client:round3:request_state');

        return () => {
            socket.off('server:round3:state_update');
            socket.off('server:round3:timer_tick');
        };
    }, [socket]);

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    if (!gameState) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050510]">
                <h2 className="text-3xl text-[var(--color-neon-cyan)] animate-pulse font-black tracking-widest">CONNECTING TO ARENA...</h2>
            </div>
        );
    }

    const {
        activeSubRound,
        activeQuestion,
        showAnswer,
        timerTime,
        buzzerQueue = [],
        passCount = 0,
        buzzerLocked,
        teams = [],
        clientFontSize = 60, // This will now be overridden by localFontVh for display
        allocatedTeamId = null,
        showTimer = true
    } = gameState;

    const allocatedTeam = teams.find(t => t.id === allocatedTeamId);

    const isWaiting = !activeQuestion;

    // Sub-Round Names
    const subRoundNames = {
        1: "Direct Question Round",
        2: "Visual Round",
        3: "Pass-On Round",
        4: "Buzzer Round",
        5: "Rapid Fire"
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-[#050510] text-white flex flex-col font-sans select-none fixed inset-0">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--color-neon-purple)]/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-neon-cyan)]/10 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Header / Brand */}
            <header className="flex justify-between items-center px-10 py-6 border-b border-white/10 relative z-10 glassmorphism bg-black/40">
                <div className="flex items-center gap-4">
                    <Rocket className="w-8 h-8 text-[var(--color-neon-pink)]" />
                    <div>
                        <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-purple)] uppercase">
                            MathX
                        </h1>
                        <p className="text-xs font-mono tracking-widest text-[var(--color-neon-cyan)]/80">ROUND 3 STAGE</p>
                    </div>
                </div>

                {/* Local Projector Font Size Controls */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2 px-4">
                    <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Font (vh)</span>
                    <button onClick={() => setLocalFontVh(prev => Math.max(2, prev - 0.5))} className="bg-white/10 hover:bg-white/20 text-white rounded p-1"><Minus size={16} /></button>
                    <span className="text-sm font-mono text-[var(--color-neon-cyan)] font-bold w-12 text-center">{localFontVh.toFixed(1)}</span>
                    <button onClick={() => setLocalFontVh(prev => Math.min(15, prev + 0.5))} className="bg-white/10 hover:bg-white/20 text-white rounded p-1"><Plus size={16} /></button>
                </div>

                {activeSubRound > 0 && (
                    <div className="px-6 py-2 rounded-full border border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/10 flex items-center gap-3">
                        <Zap className="text-[var(--color-neon-cyan)] shrink-0" size={20} />
                        <span className="font-bold tracking-widest uppercase text-[var(--color-neon-cyan)]">Sub-Round {activeSubRound}: {subRoundNames[activeSubRound]}</span>
                    </div>
                )}
            </header>

            {/* Main Content Arena */}
            <main className="flex-1 relative z-10 flex flex-col xl:flex-row gap-8 p-8 max-w-[100vw] mx-auto w-full h-full">

                {/* Left Panel: The Question Board (Takes ~75% width) */}
                <div className="flex-[3] flex flex-col relative h-full">
                    {isWaiting ? (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center w-full h-full text-center bg-black/40 rounded-3xl border border-white/10 backdrop-blur-sm">
                            <Rocket className="w-32 h-32 mb-8 text-white/10" />
                            <h2 className="text-6xl font-black uppercase tracking-[0.2em] mb-4 text-white">
                                {subRoundNames[activeSubRound] || "Awaiting Phase"}
                            </h2>
                            <div className="w-24 h-[2px] bg-[var(--color-neon-cyan)]/40 my-6"></div>
                            <p className="text-xl tracking-[0.3em] uppercase font-medium text-white/50 animate-pulse">Prepare for next question</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-6">

                            {/* Horizontal Progress Timer above question */}
                            {showTimer && (
                                <div className="flex items-center gap-6 bg-black/40 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
                                    <Clock className="w-8 h-8 shrink-0 text-[var(--color-neon-cyan)]" />
                                    <div className="flex-1 mt-6">
                                        <HorizontalTimer time={timerTime} maxTime={60} />
                                    </div>
                                    <span className={`text-5xl font-black font-mono tracking-tighter w-24 text-right ${timerTime <= 10 ? 'text-[var(--color-neon-pink)] animate-pulse' : 'text-white'}`}>{timerTime}s</span>
                                </div>
                            )}

                            {/* Massive Question Box - STRICTLY NO SCROLL */}
                            <motion.div
                                key={`q-${activeQuestion.id}`}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col bg-black/50 border border-white/10 rounded-3xl p-10 relative overflow-hidden"
                            >
                                <div className="absolute top-8 left-8 font-mono text-lg tracking-widest font-bold flex items-center gap-3 text-[var(--color-neon-cyan)]/70">
                                    <div className="w-3 h-3 rounded-full bg-[var(--color-neon-cyan)]"></div> Question #{activeQuestion.id}
                                </div>

                                {allocatedTeamId && (
                                    <div className={`absolute top-8 right-8 px-6 py-2 border rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(255,0,255,0.3)] animate-pulse bg-[var(--color-neon-pink)]/20 border-[var(--color-neon-pink)] text-[var(--color-neon-pink)]`}>
                                        <Zap className="text-[var(--color-neon-pink)]" size={20} />
                                        <span className={`font-bold tracking-widest uppercase text-[var(--color-neon-pink)]`}>
                                            {activeSubRound === 3
                                                ? `Base: ${allocatedTeam?.name} (Blocked)`
                                                : `Allocated: ${allocatedTeam?.name}`
                                            }
                                        </span>
                                    </div>
                                )}

                                <div className="flex-1 flex flex-col items-center justify-center mt-12 w-full max-w-5xl mx-auto">
                                    {/* Visual Round Support */}
                                    {activeSubRound === 2 && activeQuestion.imageUrl && (
                                        <div className="mb-10 max-h-[40vh] rounded-2xl overflow-hidden border-2 border-[var(--color-neon-purple)]/30 shadow-[0_0_30px_rgba(188,19,254,0.15)] flex justify-center w-full">
                                            <img src={activeQuestion.imageUrl} alt="Visual Reference" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    )}

                                    <div
                                        className="w-full flex flex-col items-center gap-12 transition-all duration-300"
                                        style={{ fontSize: `${localFontVh}vh`, lineHeight: '1.2' }}
                                    >
                                        {/* Main Question Text */}
                                        <div className="leading-tight font-medium text-white text-center break-words w-full">
                                            <Latex>{activeQuestion.mathText || activeQuestion.text}</Latex>
                                        </div>

                                        {/* MCQ Options */}
                                        {activeQuestion.options && activeQuestion.options.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl mt-8">
                                                {activeQuestion.options.map((opt, idx) => {
                                                    const letter = String.fromCharCode(65 + idx); // A, B, C, D
                                                    return (
                                                        <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex gap-6 items-center shadow-lg hover:bg-white/10 transition-colors">
                                                            <div className="flex items-center justify-center w-[1.5em] h-[1.5em] shrink-0 rounded-xl bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] font-black border border-[var(--color-neon-cyan)]/50">
                                                                {letter}
                                                            </div>
                                                            <div className="text-white/90" style={{ fontSize: `${Math.max(2, localFontVh * 0.7)}vh` }}>
                                                                <Latex>{opt}</Latex>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Answer Display */}
                                <AnimatePresence>
                                    {showAnswer && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="mt-6 bg-green-500/10 border-2 border-green-500/50 p-6 rounded-[2rem] text-center w-full max-w-5xl self-center shrink-0"
                                        >
                                            <span className="block text-green-400 font-bold tracking-widest uppercase mb-2 text-[0.4em]">Correct Answer</span>
                                            <div className="font-black text-white" style={{ fontSize: `${localFontVh * 0.8}vh` }}>
                                                <Latex>
                                                    {activeQuestion.options && activeQuestion.correctIndex !== undefined
                                                        ? `${String.fromCharCode(65 + activeQuestion.correctIndex)}. ${activeQuestion.options[activeQuestion.correctIndex]}`
                                                        : "Answer revealed by Quizmaster!"}
                                                </Latex>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Sub-round specific HUD / Scoreboard (Takes ~25% width) */}
                <div className="flex-1 flex flex-col gap-6 h-full">

                    {/* BUZZER QUEUE HUD (Active in Subround 3 & 4) */}
                    {(activeSubRound === 3 || activeSubRound === 4) && (
                        <div className="bg-black/60 border border-[var(--color-neon-purple)]/40 shadow-[0_0_20px_rgba(188,19,254,0.1)] rounded-3xl p-6 flex flex-col h-1/2">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-xl font-bold uppercase tracking-widest text-[var(--color-neon-purple)] flex items-center gap-3">
                                    <Zap size={24} /> Buzzer Queue
                                </h3>

                                {buzzerLocked ?
                                    <span className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-red-500/30">
                                        <Lock size={14} /> Locked
                                    </span>
                                    :
                                    <span className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-green-500/30 animate-pulse">
                                        <Unlock size={14} /> Armed
                                    </span>
                                }
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 custom-[var(--color-neon-purple)]-scrollbar pr-2">
                                {buzzerQueue.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-white/20">
                                        <AlertTriangle size={48} className="mb-4" />
                                        <p className="font-bold tracking-widest uppercase">No Buzzers Yet</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {buzzerQueue.map((buzz, i) => {
                                            const teamInfo = teams.find(t => t.id === buzz.teamId);
                                            // The active answering team is the one at index `passCount`
                                            const isActiveTurn = i === passCount;
                                            const isPassed = i < passCount;

                                            let queueStyle = "bg-white/5 border-white/10 text-white/50";
                                            if (isActiveTurn) queueStyle = "bg-[var(--color-neon-cyan)]/20 border-[var(--color-neon-cyan)]/50 text-white shadow-[0_0_15px_rgba(0,255,255,0.3)] ring-2 ring-[var(--color-neon-cyan)]";
                                            else if (isPassed) queueStyle = "bg-red-500/10 border-red-500/30 text-white/30 line-through opacity-50";

                                            return (
                                                <motion.div
                                                    key={buzz.teamId}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className={`p-4 rounded-xl border flex items-center gap-4 transition-all duration-300 ${queueStyle}`}
                                                >
                                                    <div className={`w-10 h-10 shrink-0 flex justify-center items-center rounded-lg font-black text-xl ${isActiveTurn ? 'bg-[var(--color-neon-cyan)] text-black' : 'bg-black/50 border border-white/20'}`}>
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-lg">{teamInfo?.name || `Team ${buzz.teamId}`}</div>
                                                        {isActiveTurn && <div className="text-xs uppercase tracking-widest text-[var(--color-neon-cyan)] font-bold">Answering Now</div>}
                                                        {isPassed && <div className="text-xs uppercase tracking-widest text-red-500 font-bold">Passed / Invalid</div>}
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SCOREBOARD (Only visible when NO question is active) */}
                    {isWaiting && (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col flex-1">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-xl font-bold uppercase tracking-widest flex items-center gap-3">
                                    <Trophy size={24} className="text-[var(--color-neon-cyan)]" /> Leaderboard
                                </h3>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-[var(--color-neon-cyan)]-scrollbar">
                                {[...teams].sort((a, b) => b.score - a.score).map((team, index) => (
                                    <div key={team.id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="text-white/30 font-black text-xl w-6">{index + 1}</div>
                                            <div className="font-bold text-lg">{team.name}</div>
                                        </div>
                                        <div className="font-black text-2xl text-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]/10 px-4 py-1 rounded-lg">
                                            {team.score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Round3Client;
