import React, { useEffect, useState } from 'react';
import { useSocket } from '../SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Trophy, Clock, Zap, Lock, Unlock, AlertTriangle, Minus, Plus, Volume2 } from 'lucide-react';
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
    const [imageZoom, setImageZoom] = useState(2);

    // Buzzer Sound Logic
    const buzzerSound = React.useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2959/2959-preview.mp3'));
    const prevQueueLength = React.useRef(0);

    useEffect(() => {
        if (!socket) return;

        socket.on('server:round3:state_update', (state) => {
            // Check if queue length increased -> play sound
            const currentQueue = state.buzzerQueue || [];
            if (currentQueue.length > prevQueueLength.current) {
                buzzerSound.current.currentTime = 0; // Reset for overlap
                buzzerSound.current.play().catch(err => console.error("Sound play failed:", err));
            }
            prevQueueLength.current = currentQueue.length;
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
        clientFontSize = 60,
        allocatedTeamId = null,
        showTimer = true,
        judgedOption = null,
        rapidFire = {}
    } = gameState;

    const clampedImageZoom = Math.max(0.5, Math.min(3, imageZoom));

    const allocatedTeam = teams.find(t => t.id === allocatedTeamId);
    const rfTeam = teams.find(t => t.id === rapidFire?.teamId);
    const rfPhase = rapidFire?.phase || 'idle';
    const rfRetryQuestionIndex = rapidFire?.retryQuestionIndex ?? null;
    const isRapidFireReview = activeSubRound === 5 && rapidFire?.active && rfPhase === 'review' && !activeQuestion;
    const isWaiting = !activeQuestion && !isRapidFireReview;

    // Sub-Round Names
    const subRoundNames = {
        1: "Direct Question Round",
        2: "Visual Round",
        3: "Pass-On Round",
        4: "Buzzer Round",
        5: "Rapid Fire"
    };

    const waitingSymbols = [
        { symbol: '\u222B', className: 'top-[10%] left-[8%] text-5xl text-cyan-400/18', animate: { y: [0, -20, 16, 0], x: [0, 8, -6, 0], rotate: [0, 6, -5, 0] }, transition: { duration: 7.2, delay: 0.4, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u03C0', className: 'top-[16%] right-[9%] text-4xl text-pink-400/18', animate: { y: [0, 18, -14, 0], x: [0, -10, 5, 0], rotate: [0, -4, 7, 0] }, transition: { duration: 8.4, delay: 1.3, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u03A3', className: 'bottom-[14%] left-[12%] text-5xl text-yellow-300/18', animate: { y: [0, -14, 12, 0], x: [0, 6, -8, 0], rotate: [0, 5, -3, 0] }, transition: { duration: 6.9, delay: 2.1, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u221A', className: 'bottom-[12%] right-[14%] text-4xl text-cyan-300/18', animate: { y: [0, 20, -10, 0], x: [0, -7, 9, 0], rotate: [0, -6, 4, 0] }, transition: { duration: 7.8, delay: 0.7, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u221E', className: 'top-[32%] left-[10%] text-4xl text-white/12', animate: { y: [0, -12, 18, 0], x: [0, 11, -7, 0], rotate: [0, 4, -6, 0] }, transition: { duration: 9.1, delay: 1.9, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u2206', className: 'top-[28%] right-[12%] text-4xl text-white/12', animate: { y: [0, 14, -16, 0], x: [0, -9, 6, 0], rotate: [0, -5, 6, 0] }, transition: { duration: 6.6, delay: 2.6, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: 'x\u00B2 + y\u00B2', className: 'top-[22%] left-[24%] text-3xl text-white/10', animate: { y: [0, -10, 12, 0], x: [0, 7, -5, 0] }, transition: { duration: 8.8, delay: 0.9, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: 'lim x\u21920', className: 'top-[22%] right-[24%] text-3xl text-white/10', animate: { y: [0, 11, -13, 0], x: [0, -8, 5, 0] }, transition: { duration: 7.7, delay: 1.7, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: 'e^i\u03C0 + 1 = 0', className: 'bottom-[24%] left-[22%] text-3xl text-white/10', animate: { y: [0, -12, 8, 0], x: [0, 9, -4, 0] }, transition: { duration: 9.4, delay: 2.8, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: 'd/dx', className: 'bottom-[24%] right-[23%] text-3xl text-white/10', animate: { y: [0, 13, -9, 0], x: [0, -6, 7, 0] }, transition: { duration: 8.1, delay: 0.2, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u03B8', className: 'top-[50%] left-[6%] text-4xl text-pink-300/14', animate: { y: [0, -16, 10, 0], x: [0, 8, -5, 0], rotate: [0, 5, -4, 0] }, transition: { duration: 7.4, delay: 1.1, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u03B1 + \u03B2', className: 'bottom-[42%] right-[7%] text-3xl text-cyan-300/14', animate: { y: [0, 15, -11, 0], x: [0, -8, 4, 0], rotate: [0, -4, 5, 0] }, transition: { duration: 8.9, delay: 2.4, repeat: Infinity, ease: 'easeInOut' } },
    ];

    const waitingTiles = [
        { symbol: '+', animate: { y: [0, -10, 6, 0], rotate: [0, 7, -5, 0] }, transition: { duration: 6.8, delay: 0.2, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u2212', animate: { y: [0, 8, -12, 0], rotate: [0, -6, 4, 0] }, transition: { duration: 7.6, delay: 1.1, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u00D7', animate: { y: [0, -7, 11, 0], rotate: [0, 5, -7, 0] }, transition: { duration: 6.4, delay: 1.8, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u00F7', animate: { y: [0, 10, -8, 0], rotate: [0, -4, 6, 0] }, transition: { duration: 8.1, delay: 0.5, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '=', animate: { y: [0, -9, 7, 0], rotate: [0, 3, -4, 0] }, transition: { duration: 7.2, delay: 2.2, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u221E', animate: { y: [0, 12, -9, 0], rotate: [0, -5, 5, 0] }, transition: { duration: 8.7, delay: 0.8, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u2206', animate: { y: [0, -8, 10, 0], rotate: [0, 6, -3, 0] }, transition: { duration: 6.9, delay: 1.5, repeat: Infinity, ease: 'easeInOut' } },
        { symbol: '\u03B8', animate: { y: [0, 11, -10, 0], rotate: [0, -7, 4, 0] }, transition: { duration: 8.3, delay: 2.5, repeat: Infinity, ease: 'easeInOut' } },
    ];

    return (
        <div className="h-screen w-screen overflow-hidden bg-[#050510] text-white flex flex-col font-sans select-none fixed inset-0">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--color-neon-purple)]/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--color-neon-cyan)]/10 rounded-full blur-[150px] pointer-events-none"></div>

            {/* RAPID FIRE RESULTS MODAL */}
            <AnimatePresence>
                {rapidFire?.showResults && rapidFire?.results && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 overflow-y-auto"
                    >
                        <div className="w-full max-w-4xl">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-bold uppercase tracking-widest text-sm mb-4">
                                    <Zap size={16} /> Rapid Fire Results — Set {rapidFire.results.setNumber}
                                </div>
                                <h2 className="text-5xl font-black text-white mb-2">{rapidFire.results.teamName}</h2>
                                <div className="flex items-center justify-center gap-6 mt-4">
                                    <div className="text-center">
                                        <div className="text-6xl font-black text-green-400">{rapidFire.results.correctCount}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-widest mt-1">Correct</div>
                                    </div>
                                    <div className="text-4xl text-white/20 font-thin">/</div>
                                    <div className="text-center">
                                        <div className="text-6xl font-black text-white/60">{rapidFire.results.total}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-widest mt-1">Total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-6xl font-black text-red-400">{rapidFire.results.total - rapidFire.results.correctCount}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-widest mt-1">Wrong</div>
                                    </div>
                                </div>
                            </div>

                            {/* Per-question breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {rapidFire.results.breakdown.map((item) => (
                                    <div
                                        key={item.questionNumber}
                                        className={`p-4 rounded-2xl border flex gap-4 items-start ${item.isCorrect
                                            ? 'bg-green-500/10 border-green-500/40'
                                            : 'bg-red-500/10 border-red-500/40'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-lg ${item.isCorrect ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
                                            }`}>
                                            {item.isCorrect ? '✓' : '✗'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Q{item.questionNumber}</div>
                                            {item.wasRetried && (
                                                <div className="mb-2 inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-cyan-300">
                                                    Retry Used
                                                </div>
                                            )}
                                            <div className="text-sm text-white/80 line-clamp-2 mb-2">
                                                <Latex>{item.text}</Latex>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {item.options.map((opt, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`text-[10px] px-2 py-1 rounded-lg font-bold border ${idx === item.correctIndex
                                                            ? 'bg-green-500/30 border-green-500/50 text-green-300'
                                                            : idx === item.selectedOption && !item.isCorrect
                                                                ? 'bg-red-500/30 border-red-500/50 text-red-300 line-through'
                                                                : 'bg-white/5 border-white/10 text-white/30'
                                                            }`}
                                                    >
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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

                {/* Local Projector Font Size & Audio Controls */}
                <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-xl p-2 px-4">
                    <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Audio</span>
                        <button
                            onClick={() => {
                                buzzerSound.current.currentTime = 0;
                                buzzerSound.current.play().catch(console.error);
                            }}
                            className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 p-2 rounded-lg transition-colors border border-emerald-500/30"
                            title="Test Buzzer Sound"
                        >
                            <Volume2 size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Font (vh)</span>
                        <button onClick={() => setLocalFontVh(prev => Math.max(2, prev - 0.5))} className="bg-white/10 hover:bg-white/20 text-white rounded p-1"><Minus size={16} /></button>
                        <span className="text-sm font-mono text-[var(--color-neon-cyan)] font-bold w-12 text-center">{localFontVh.toFixed(1)}</span>
                        <button onClick={() => setLocalFontVh(prev => Math.min(15, prev + 0.5))} className="bg-white/10 hover:bg-white/20 text-white rounded p-1"><Plus size={16} /></button>
                    </div>
                </div>

                {activeSubRound > 0 && (
                    <div className="px-6 py-2 rounded-full border border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/10 flex items-center gap-3">
                        <Zap className="text-[var(--color-neon-cyan)] shrink-0" size={20} />
                        <span className="font-bold tracking-widest uppercase text-[var(--color-neon-cyan)]">Sub-Round {activeSubRound}: {subRoundNames[activeSubRound]}</span>
                    </div>
                )}
            </header>

            {/* Main Content Arena */}
            <main className={`flex-1 relative z-10 flex w-full h-full ${isWaiting ? 'items-center justify-center p-8' : 'flex-col gap-8 p-8 xl:flex-row'}`}>

                {isRapidFireReview ? (
                    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-yellow-400/20 bg-black/50 p-8 backdrop-blur-sm">
                        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
                            {rapidFire.questions.map((question, index) => {
                                const hadOriginalAnswer = rapidFire.adminAnswers[index] !== undefined;
                                const isRetryQuestion = rfRetryQuestionIndex === index;
                                const hasRetryAnswer = isRetryQuestion && rapidFire.retrySelectedOption !== null;

                                return (
                                    <div
                                        key={question.id}
                                        className={`rounded-3xl border p-5 ${isRetryQuestion ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03]'}`}
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-yellow-300">
                                                Q{index + 1}
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                                                {hasRetryAnswer ? 'Retry Answered' : hadOriginalAnswer ? 'Answered' : 'Pending'}
                                            </div>
                                        </div>
                                        <div className="text-base leading-relaxed text-white/85">
                                            <Latex>{question.content?.mathText || question.content?.text || ''}</Latex>
                                        </div>
                                        {!!question.content?.options?.length && (
                                            <div className="mt-4 grid grid-cols-2 gap-2">
                                                {question.content.options.map((opt, optIndex) => (
                                                    <div
                                                        key={optIndex}
                                                        className={`rounded-xl border px-3 py-2 text-sm ${isRetryQuestion && rapidFire.retrySelectedOption === optIndex
                                                            ? 'border-cyan-400/60 bg-cyan-400/15 text-white'
                                                            : 'border-white/10 bg-white/5 text-white/70'
                                                            }`}
                                                    >
                                                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-black/30 text-[10px] font-black">
                                                            {String.fromCharCode(65 + optIndex)}
                                                        </span>
                                                        <Latex>{opt}</Latex>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : isWaiting ? (
                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/50 text-center backdrop-blur-sm">
                        <div className="absolute inset-0 pointer-events-none">
                            {waitingSymbols.map((item) => (
                                <motion.div
                                    key={item.symbol}
                                    className={`absolute font-black ${item.className}`}
                                    animate={item.animate}
                                    transition={item.transition}
                                >
                                    {item.symbol}
                                </motion.div>
                            ))}
                        </div>

                        <div className="relative z-10 flex w-full max-w-6xl flex-col items-center justify-center px-8">
                            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[var(--color-neon-cyan)]/25 bg-[var(--color-neon-cyan)]/10 px-6 py-2 text-sm font-bold uppercase tracking-[0.35em] text-[var(--color-neon-cyan)]">
                                <Rocket className="h-5 w-5" />
                                MathX Presents
                            </div>

                            <h1 className="bg-gradient-to-r from-white via-[var(--color-neon-cyan)] to-[var(--color-neon-pink)] bg-clip-text text-5xl font-black uppercase tracking-[0.18em] text-transparent md:text-7xl">
                                National Level Quiz
                            </h1>

                            <div className="mt-6 flex items-center gap-4">
                                <div className="h-[2px] w-16 bg-[var(--color-neon-pink)]/50"></div>
                                <div className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold uppercase tracking-[0.35em] text-white/70">
                                    {subRoundNames[activeSubRound] || 'Awaiting Phase'}
                                </div>
                                <div className="h-[2px] w-16 bg-[var(--color-neon-cyan)]/50"></div>
                            </div>

                            <p className="mt-8 text-2xl font-medium uppercase tracking-[0.28em] text-white/55 animate-pulse">
                                Prepare for the next challenge
                            </p>

                            <div className="mt-12 grid grid-cols-4 gap-5 md:gap-7">
                                {waitingTiles.map((item) => (
                                    <motion.div
                                        key={item.symbol}
                                        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl font-black text-white/70 shadow-[0_0_20px_rgba(255,255,255,0.04)] md:h-20 md:w-20"
                                        animate={item.animate}
                                        transition={item.transition}
                                    >
                                        {item.symbol}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>

                {/* Left Panel: The Question Board (Takes ~75% width) */}
                <div className="flex-[3] flex flex-col relative h-full">
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
                                                ? `Base: ${allocatedTeam?.id}. ${allocatedTeam?.name} (Blocked)`
                                                : `Allocated: ${allocatedTeam?.id}. ${allocatedTeam?.name}`
                                            }
                                        </span>
                                    </div>
                                )}

                                <div className="flex-1 flex flex-col items-center justify-center mt-12 w-full max-w-5xl mx-auto">
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
                                                    const isJudged = judgedOption?.selectedIndex === idx;
                                                    const optionStateClass = isJudged
                                                        ? judgedOption.isCorrect
                                                            ? 'bg-green-500/20 border-green-400 text-white shadow-[0_0_20px_rgba(74,222,128,0.25)]'
                                                            : 'bg-red-500/20 border-red-400 text-white shadow-[0_0_20px_rgba(248,113,113,0.25)]'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10';
                                                    const badgeStateClass = isJudged
                                                        ? judgedOption.isCorrect
                                                            ? 'bg-green-500/20 text-green-300 border-green-400/50'
                                                            : 'bg-red-500/20 text-red-300 border-red-400/50'
                                                        : 'bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)]/50';

                                                    return (
                                                        <div key={idx} className={`border rounded-2xl p-6 flex gap-6 items-center shadow-lg transition-colors ${optionStateClass}`}>
                                                            <div className={`flex items-center justify-center w-[1.5em] h-[1.5em] shrink-0 rounded-xl font-black border ${badgeStateClass}`}>
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
                </div>

                {/* Right Panel: Sub-round specific HUD */}
                <div className="flex-1 flex flex-col gap-6 h-full">

                    {/* VISUAL ROUND IMAGE PANEL (Sub-Round 2) */}
                    {activeSubRound === 2 && activeQuestion?.imageUrl && (
                        <div className="bg-black/60 border border-[var(--color-neon-purple)]/40 shadow-[0_0_20px_rgba(188,19,254,0.1)] rounded-3xl p-6 flex flex-col flex-1 min-h-0">
                            <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
                                <Zap size={20} className="text-[var(--color-neon-purple)]" />
                                <h3 className="text-lg font-bold uppercase tracking-widest text-[var(--color-neon-purple)]">
                                    Visual Reference
                                </h3>
                            </div>

                            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                                <img
                                    src={activeQuestion.imageUrl}
                                    alt="Visual Reference"
                                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                                    style={{ transform: `scale(${clampedImageZoom})` }}
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                                <span className="text-xs font-bold uppercase tracking-widest text-white/50">Zoom</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setImageZoom((prev) => Math.max(0.5, prev - 0.25))}
                                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="w-14 text-center text-sm font-mono font-bold text-[var(--color-neon-cyan)]">
                                        {clampedImageZoom.toFixed(2)}x
                                    </span>
                                    <button
                                        onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
                                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RAPID FIRE PROGRESS HUD (Sub-Round 5) */}
                    {activeSubRound === 5 && rapidFire?.active && (
                        <div className="bg-black/60 border border-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.1)] rounded-3xl p-6 flex flex-col gap-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <h3 className="text-lg font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-3">
                                    <Zap size={20} /> Rapid Fire
                                </h3>
                                <span className="text-sm font-bold text-white/60">Set {rapidFire.setNumber}</span>
                            </div>
                            <div className="text-center">
                                <div className="text-5xl font-black text-white mb-1">
                                    {rfPhase === 'review'
                                        ? 'Review'
                                        : rfRetryQuestionIndex !== null
                                            ? `Q${rfRetryQuestionIndex + 1}`
                                            : Math.min(rapidFire.questionIndex + 1, rapidFire.questions?.length || 10)}
                                    {rfPhase === 'playing' && (
                                        <span className="text-white/30 text-2xl"> / {rapidFire.questions?.length || 10}</span>
                                    )}
                                </div>
                                <div className="text-xs text-white/40 uppercase tracking-widest">
                                    {rfPhase === 'review' ? 'All Questions Shown' : rfRetryQuestionIndex !== null ? 'Retry Selected' : 'Question'}
                                </div>
                            </div>
                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-yellow-400 rounded-full"
                                    animate={{ width: `${rfPhase === 'review' ? 100 : ((rapidFire.questionIndex || 0) / (rapidFire.questions?.length || 10)) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            {rfTeam && (
                                <div className="text-center text-sm font-bold text-[var(--color-neon-cyan)] uppercase tracking-widest">
                                    {rfTeam.id}. {rfTeam.name}
                                </div>
                            )}
                        </div>
                    )}

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
                                                        <div className="font-bold text-lg">{teamInfo?.id}. {teamInfo?.name || `Team ${buzz.teamId}`}</div>
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

                </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default Round3Client;
