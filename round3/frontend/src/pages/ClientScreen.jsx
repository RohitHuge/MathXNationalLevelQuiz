import React from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';
import { Rocket, Trophy, Clock, GraduationCap } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const HorizontalTimer = ({ time, maxTime = 60, theme }) => {
    const clampedTime = Math.max(0, Math.min(time, maxTime));
    const percentage = (clampedTime / maxTime) * 100;
    const isCritical = clampedTime <= 10;
    const isLight = theme === 'light';

    return (
        <div className="w-full relative h-3 bg-white/10 rounded-full overflow-hidden mb-6">
            <motion.div
                initial={{ width: "100%" }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                className={`h-full rounded-full ${isLight ? (isCritical ? 'bg-red-500' : 'bg-neon-blue') : (isCritical ? 'bg-neon-pink shadow-[0_0_15px_rgba(255,0,255,0.8)]' : 'bg-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.8)]')}`}
            />
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

    const { roundName, activeQuestion, currentTeamFor, showAnswer, isWaitingForQuestion, showLeaderboard, teams, theme = 'dark' } = gameState;

    const isLight = theme === 'light';
    const bgClass = isLight ? 'bg-slate-50' : 'bg-[#050510]';
    const textBase = isLight ? 'text-slate-900' : 'text-white';
    const textMuted = isLight ? 'text-slate-500' : 'text-white/50';
    const borderClass = isLight ? 'border-slate-300' : 'border-white/10';
    const cardBg = isLight ? 'bg-white shadow-md' : 'bg-white/5 backdrop-blur-md';

    return (
        <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${bgClass} flex flex-col font-sans`}>
            {/* Background Decor - Removed Purple, kept Cyan and Blue */}
            {!isLight && (
                <>
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[150px] pointer-events-none"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neon-cyan/10 rounded-full blur-[150px] pointer-events-none"></div>
                </>
            )}

            {/* Header / Brand */}
            <header className={`flex justify-between items-center px-10 py-6 border-b ${borderClass} relative z-10 transition-colors duration-500 ${isLight ? 'bg-white/80' : 'glassmorphism'}`}>
                <div className="flex items-center gap-4">
                    <Rocket className="w-8 h-8 text-neon-pink" />
                    <div>
                        <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue uppercase">
                            MathX
                        </h1>
                        <p className={`text-xs font-mono tracking-widest ${isLight ? 'text-slate-600' : 'text-neon-cyan/80'}`}>{roundName}</p>
                    </div>
                </div>
            </header>

            {/* Main Content Arena */}
            <main className="flex-1 relative z-10 flex">

                {/* VIEW 1: Waiting for Question */}
                {isWaitingForQuestion && !showLeaderboard && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center w-full h-full text-center">
                        <Rocket className={`w-24 h-24 mb-8 ${isLight ? 'text-slate-300' : 'text-white/10'}`} />
                        <h2 className={`text-6xl font-light uppercase tracking-[0.2em] mb-4 ${textBase}`}>
                            {roundName}
                        </h2>
                        <div className="w-16 h-[2px] bg-neon-cyan/40 my-6"></div>
                        <p className={`text-xl tracking-[0.3em] uppercase font-medium ${textMuted}`}>Please wait for the next question</p>
                    </div>
                )}

                {/* VIEW 2: Leaderboard */}
                {showLeaderboard && (
                    <div className="flex flex-col items-center justify-center w-full h-full p-12">
                        <Trophy className="w-28 h-28 text-neon-pink mb-8 drop-shadow-[0_0_30px_rgba(255,0,255,0.8)]" />
                        <h2 className={`text-6xl font-black mb-16 tracking-[0.2em] uppercase text-glow-pink ${textBase}`}>Leaderboard</h2>
                        <div className="w-full max-w-5xl flex flex-col gap-6">
                            {[...teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                                <motion.div key={team.id} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.15 }} className={`flex justify-between items-center p-8 rounded-3xl transition-colors duration-500 ${isLight ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-200' : 'bg-white/5 border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.02)] backdrop-blur-sm'}`}>
                                    <div className="flex items-center gap-8">
                                        <span className={`text-5xl font-black ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-600' : textMuted}`}>#{idx + 1}</span>
                                        <div>
                                            <h3 className={`text-4xl font-bold mb-2 ${textBase}`}>{team.name}</h3>
                                            <span className={`text-xl tracking-wider uppercase font-medium ${isLight ? 'text-neon-blue' : 'text-neon-cyan/80'}`}>{team.college}</span>
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
                    <div className="flex flex-col w-full h-full max-w-[1600px] mx-auto relative z-10 p-8">

                        {/* Top Horizontal Bar: Team Details & Timer */}
                        <div className="flex flex-col mb-8">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`rounded-3xl p-6 flex items-center justify-between border shadow-sm transition-colors duration-500 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}
                            >
                                <div className="flex items-center gap-8">
                                    <div className={`p-4 rounded-2xl ${isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-white/50'}`}>
                                        <span className="text-sm font-bold tracking-[0.2em] uppercase">Current Turn</span>
                                    </div>
                                    <div>
                                        <h2 className={`text-4xl font-black mb-1 ${textBase}`}>{currentTeamFor?.name || 'Waiting...'}</h2>
                                        <div className={`flex items-center gap-2 font-medium text-lg ${isLight ? 'text-neon-blue' : 'text-neon-cyan/80'}`}>
                                            <GraduationCap className="w-5 h-5" />
                                            <span>{currentTeamFor?.college || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-10">
                                    {/* Score Block */}
                                    <div className="text-right">
                                        <span className={`text-sm tracking-widest font-semibold block mb-1 uppercase ${textMuted}`}>Team Score</span>
                                        <div className={`text-5xl font-black ${isLight ? 'text-slate-800' : 'text-neon-pink text-glow-pink'}`}>
                                            {currentTeamFor?.score || 0}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Horizontal Progress Timer exactly underneath Team card */}
                            <div className="mt-4 px-2 flex items-center gap-6">
                                <Clock className={`w-6 h-6 shrink-0 ${isLight ? 'text-slate-400' : 'text-white/30'}`} />
                                <div className="flex-1 mt-6">
                                    <HorizontalTimer time={timer} maxTime={60} theme={theme} />
                                </div>
                                <span className={`text-3xl font-black font-mono tracking-tighter w-16 text-right ${isLight ? 'text-slate-800' : 'text-white'}`}>{timer}</span>
                            </div>
                        </div>

                        {/* Central Massive Question Display */}
                        <div className="flex-1 flex flex-col h-full">
                            {activeQuestion ? (
                                <motion.div
                                    key={activeQuestion.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                    className="flex-1 flex flex-col"
                                >
                                    {/* Question Box */}
                                    <div className={`flex-[1.5] p-12 rounded-[2rem] border relative mb-8 flex flex-col justify-center transition-colors duration-500 ${cardBg} ${borderClass}`}>
                                        <div className={`absolute top-8 left-8 font-mono text-base tracking-widest font-bold flex items-center gap-3 ${isLight ? 'text-neon-blue' : 'text-neon-cyan/70'}`}>
                                            <div className={`w-3 h-3 rounded-full ${isLight ? 'bg-neon-blue' : 'bg-neon-cyan'}`}></div> Question #{activeQuestion.id}
                                        </div>
                                        <div className={`text-6xl leading-snug font-light mt-10 ${textBase} mx-auto max-w-5xl text-center`}>
                                            {parseLatexText(activeQuestion.question)}
                                        </div>
                                    </div>

                                    {/* Options Grid */}
                                    <div className="flex-1 grid grid-cols-2 gap-8 relative shrink-0">
                                        {activeQuestion.options.map((option, index) => {
                                            const isCorrect = showAnswer && index === activeQuestion.correctOption;
                                            const isWrong = showAnswer && index !== activeQuestion.correctOption;

                                            let optionBg = isLight ? 'bg-white' : 'bg-white/5';
                                            let optionBorder = borderClass;
                                            let optionText = isLight ? 'text-slate-800' : 'text-white/90';
                                            let badgeBg = isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-white/60';

                                            if (isCorrect) {
                                                optionBg = isLight ? 'bg-green-50' : 'bg-green-500/10';
                                                optionBorder = isLight ? 'border-green-400' : 'border-green-500/50';
                                                optionText = isLight ? 'text-green-800' : 'text-green-400';
                                                badgeBg = isLight ? 'bg-green-200 text-green-800' : 'bg-green-500/20 text-green-400';
                                            } else if (isWrong) {
                                                optionBg = isLight ? 'bg-red-50' : 'bg-red-500/5';
                                                optionBorder = isLight ? 'border-red-300' : 'border-red-500/20';
                                                optionText = isLight ? 'text-red-400 opacity-50 truncate' : 'text-white/30 truncate';
                                                badgeBg = isLight ? 'bg-red-100 text-red-300' : 'bg-white/5 text-white/20';
                                            }

                                            return (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className={`p-8 rounded-[2rem] text-4xl font-medium border-2 flex items-center transition-colors duration-300 ${optionBg} ${optionBorder} ${optionText}`}
                                                >
                                                    <span className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center mr-8 font-black text-2xl ${badgeBg}`}>
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
                                <div className={`flex-1 flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed ${isLight ? 'border-slate-300 bg-slate-100/50' : 'border-white/20 bg-white/5'}`}>
                                    <h2 className={`text-5xl font-light tracking-[0.2em] uppercase ${textMuted}`}>No Question Loaded</h2>
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
