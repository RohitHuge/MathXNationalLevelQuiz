import React from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';
import { Rocket, Trophy, Clock, GraduationCap } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const CircularTimer = ({ time, maxTime = 60 }) => {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const clampedTime = Math.max(0, Math.min(time, maxTime));
    const strokeDashoffset = circumference - (clampedTime / maxTime) * circumference;

    return (
        <div className="relative flex items-center justify-center flex-col">
            <svg width="140" height="140" className="transform -rotate-90">
                <circle cx="70" cy="70" r={radius} fill="transparent" className="stroke-white/10" strokeWidth="4" />
                <circle
                    cx="70" cy="70" r={radius} fill="transparent"
                    stroke="var(--color-neon-cyan)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-linear"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center mt-1">
                <div className="text-5xl font-black font-mono tracking-tighter text-white">
                    {clampedTime}
                </div>
            </div>
        </div>
    );
};

export default function ClientScreen() {
    const { gameState, timer } = useSocket();

    if (!gameState) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <h2 className="text-3xl text-neon-cyan text-glow-cyan animate-pulse">Connecting to MathX Core Server...</h2>
            </div>
        );
    }

    const { roundName, activeQuestion, currentTeamFor, showAnswer, isWaitingForQuestion, showLeaderboard, teams } = gameState;

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#050510] flex flex-col">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/20 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neon-cyan/20 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Header */}
            <header className="flex justify-between items-center p-8 border-b border-white/10 glassmorphism relative z-10">
                <div className="flex items-center gap-4">
                    <Rocket className="w-10 h-10 text-neon-pink" />
                    <div>
                        <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-purple drop-shadow-[0_0_10px_rgba(255,0,255,0.6)] uppercase">
                            MathX
                        </h1>
                        <p className="text-neon-cyan/80 text-sm font-mono tracking-widest">{roundName}</p>
                    </div>
                </div>

                {/* Global Timer Component */}
                {!isWaitingForQuestion && !showLeaderboard && (
                    <div className="flex flex-col items-center">
                        <CircularTimer time={timer} maxTime={60} />
                    </div>
                )}
            </header>

            {/* Main Content Arena */}
            <main className="flex-1 relative z-10 flex">

                {/* VIEW 1: Waiting for Question */}
                {isWaitingForQuestion && !showLeaderboard && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center w-full h-full text-center">
                        <Rocket className="w-24 h-24 text-white/10 mb-8" />
                        <h2 className="text-6xl font-light text-white uppercase tracking-[0.2em] mb-4">
                            {roundName}
                        </h2>
                        <div className="w-16 h-[2px] bg-neon-cyan/40 my-6"></div>
                        <p className="text-xl text-white/40 tracking-[0.3em] uppercase font-medium">Please wait for the next question</p>
                    </div>
                )}

                {/* VIEW 2: Leaderboard */}
                {showLeaderboard && (
                    <div className="flex flex-col items-center justify-center w-full h-full p-12">
                        <Trophy className="w-28 h-28 text-neon-pink mb-8 drop-shadow-[0_0_30px_rgba(255,0,255,0.8)]" />
                        <h2 className="text-6xl font-black text-white mb-16 tracking-[0.2em] uppercase text-glow-pink">Leaderboard</h2>
                        <div className="w-full max-w-5xl flex flex-col gap-6">
                            {[...teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                                <motion.div key={team.id} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.15 }} className="flex justify-between items-center bg-white/5 border border-white/20 p-8 rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.02)] backdrop-blur-sm">
                                    <div className="flex items-center gap-8">
                                        <span className={`text-5xl font-black ${idx === 0 ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : idx === 1 ? 'text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.6)]' : idx === 2 ? 'text-amber-600' : 'text-white/50'}`}>#{idx + 1}</span>
                                        <div>
                                            <h3 className="text-4xl font-bold text-white mb-2">{team.name}</h3>
                                            <span className="text-xl text-neon-cyan/80 tracking-wider uppercase font-medium">{team.college}</span>
                                        </div>
                                    </div>
                                    <div className="text-7xl font-black text-neon-blue text-glow-blue tracking-tighter">
                                        {team.score}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VIEW 3: Active Question Display */}
                {!isWaitingForQuestion && !showLeaderboard && (
                    <div className="grid grid-cols-12 gap-10 p-10 w-full h-full max-w-[1800px] mx-auto relative z-10">

                        {/* Left Column: Team Details */}
                        <div className="col-span-3 flex flex-col gap-8 h-full">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-[3px] rounded-3xl bg-gradient-to-b from-neon-purple to-neon-cyan shadow-[0_0_40px_rgba(157,0,255,0.2)] flex-1"
                            >
                                <div className="bg-[#0A0A1F] rounded-[22px] p-8 h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-neon-purple/5"></div>
                                    <span className="text-white/50 text-base tracking-[0.2em] font-semibold uppercase mb-4 relative z-10">Current Turn</span>
                                    <h2 className="text-4xl font-black text-white mb-3 relative z-10">{currentTeamFor?.name || 'Waiting...'}</h2>
                                    <div className="flex items-center gap-3 text-neon-cyan/80 mb-8 font-medium relative z-10 text-lg">
                                        <GraduationCap className="w-6 h-6" />
                                        <span>{currentTeamFor?.college || '-'}</span>
                                    </div>

                                    <div className="w-full bg-white/5 rounded-2xl p-6 border border-white/10 mt-auto relative z-10 shadow-inset">
                                        <span className="text-white/40 text-sm uppercase tracking-widest font-semibold block mb-2">Team Score</span>
                                        <div className="text-7xl font-black text-neon-pink text-glow-pink tracking-tighter">
                                            {currentTeamFor?.score || 0}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Column: Question Display */}
                        <div className="col-span-9 flex flex-col h-full">
                            {activeQuestion ? (
                                <motion.div
                                    key={activeQuestion.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                    className="flex-1 flex flex-col"
                                >
                                    {/* Question Box */}
                                    <div className="flex-1 p-10 rounded-2xl bg-white/5 border border-white/10 relative mb-8 flex flex-col justify-center">
                                        <div className="absolute top-6 left-6 text-neon-cyan/70 font-mono text-sm tracking-widest font-semibold flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-neon-cyan"></div> Question #{activeQuestion.id}
                                        </div>
                                        <div className="text-4xl text-white leading-relaxed font-normal mt-10">
                                            {parseLatexText(activeQuestion.question)}
                                        </div>
                                    </div>

                                    {/* Options Grid */}
                                    <div className="grid grid-cols-2 gap-8 relative shrink-0">
                                        {activeQuestion.options.map((option, index) => {
                                            const isCorrect = showAnswer && index === activeQuestion.correctOption;
                                            const isWrong = showAnswer && index !== activeQuestion.correctOption;

                                            return (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className={`
                            p-6 rounded-2xl text-2xl font-medium border flex items-center
                            ${isCorrect ? 'bg-green-500/10 border-green-500/50 text-green-400' :
                                                            isWrong ? 'bg-red-500/5 border-red-500/20 text-white/30 truncate' :
                                                                'bg-white/5 border-white/10 text-white/90'}
                            transition-colors duration-300
                          `}
                                                >
                                                    <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center mr-6 font-bold text-xl ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>
                                                        {String.fromCharCode(65 + index)}
                                                    </span>
                                                    <div className="flex-1 break-words">
                                                        {parseLatexText(option)}
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-white/20 bg-white/5">
                                    <h2 className="text-4xl text-white/40 font-light tracking-[0.2em] uppercase">No Question Loaded</h2>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Helper to parse strings with inline math
function parseLatexText(text) {
    const parts = text.split(/(\$.*?\$)/g);
    return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
            const math = part.slice(1, -1);
            return <InlineMath key={index} math={math} />;
        }
        return <span key={index}>{part}</span>;
    });
}
