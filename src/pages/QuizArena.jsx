import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';

const DEMO_QUESTIONS = [
    { $id: 'q1', questionText: 'If 3x + 4 = 19, what is the value of x?', options: ['3', '4', '5', '6'], correctOptionIndex: 2, points: 5 },
    { $id: 'q2', questionText: 'What is the sum of the first 100 positive integers?', options: ['5050', '5000', '1000', '5500'], correctOptionIndex: 0, points: 10 },
    { $id: 'q3', questionText: 'Evaluate the derivative of x^3 at x = 2.', options: ['12', '8', '6', '16'], correctOptionIndex: 0, points: 10 },
];

export default function QuizArena({ user }) {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins default
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        // Simulate loading the test payload
        setTimeout(() => setLoading(false), 2000);
    }, []);

    useEffect(() => {
        if (loading || submitted || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, submitted, timeLeft]);

    const handleSelect = (optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: optionIndex
        }));
    };

    const calculateScore = () => {
        let totalScore = 0;
        DEMO_QUESTIONS.forEach((q, idx) => {
            if (answers[idx] === q.correctOptionIndex) {
                totalScore += q.points || 10;
            }
        });
        return totalScore;
    };

    const handleSubmit = async () => {
        setSubmitted(true);
        setScore(calculateScore());
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
            <div className="w-20 h-20 border-4 border-white/5 border-t-[var(--color-neon-cyan)] rounded-full animate-spin shadow-[0_0_20px_rgba(0,243,255,0.4)] mb-8"></div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-purple)] tracking-widest uppercase animate-pulse">
                Generating Node Sequence
            </div>
        </div>
    );

    if (submitted) {
        return (
            <div className="max-w-3xl mx-auto mt-20 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-neon-purple)]/10 rounded-full blur-[100px] pointer-events-none"></div>
                <ThemeCard glowColor="purple" className="text-center py-16 px-8 relative z-10 border-[var(--color-neon-purple)] bg-[var(--color-slate-900)]/80 backdrop-blur-xl">
                    <div className="w-24 h-24 glass-panel rounded-full flex items-center justify-center mx-auto mb-8 border border-[var(--color-neon-cyan)] shadow-[0_0_30px_rgba(0,243,255,0.3)]">
                        <svg className="w-12 h-12 text-[var(--color-neon-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-5xl font-black mb-4 text-white tracking-tight">Sequence Terminated</h2>
                    <p className="text-[var(--color-gray-300)] mb-12 text-lg">Transmission complete. The neural databanks have recorded your results.</p>

                    <div className="glass-panel rounded-3xl p-10 mb-12 border border-[var(--color-neon-purple)]/30 inline-block shadow-[inset_0_0_50px_rgba(176,38,255,0.1)]">
                        <div className="text-sm text-[var(--color-neon-purple)] font-bold mb-3 uppercase tracking-[0.2em]">Final Evaluation Score</div>
                        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-[var(--color-gray-500)] tracking-tighter drop-shadow-2xl">
                            {score} <span className="text-3xl font-bold text-[var(--color-gray-500)] tracking-normal align-top mt-4 inline-block">PTS</span>
                        </div>
                    </div>

                    <div>
                        <ThemeButton onClick={() => navigate('/dashboard')} variant="primary" className="px-12 py-4 text-lg">
                            Return to Nexus
                        </ThemeButton>
                    </div>
                </ThemeCard>
            </div>
        );
    }

    const currentQ = DEMO_QUESTIONS[currentIndex];

    return (
        <div className="max-w-5xl mx-auto relative min-h-[85vh] flex flex-col">
            {/* Top HUD */}
            <div className="flex justify-between items-center mb-8 glass-panel rounded-2xl p-5 border border-[var(--color-neon-cyan)]/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4">
                    <div className="glass-panel px-5 py-2.5 rounded-xl font-bold text-lg text-white border border-white/10 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-neon-purple)] shadow-[0_0_10px_var(--color-neon-purple)]"></div>
                        Node <span className="text-[var(--color-neon-purple)]">{currentIndex + 1}</span> of {DEMO_QUESTIONS.length}
                    </div>
                </div>
                <div className={`glass-panel flex items-center gap-3 font-mono text-3xl font-black px-6 py-2.5 rounded-xl border tracking-widest ${timeLeft < 60 ? 'bg-red-500/10 text-red-500 border-red-500/50 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)]/30 shadow-[0_0_20px_rgba(0,243,255,0.2)]'}`}>
                    <svg className={`w-8 h-8 ${timeLeft < 60 ? 'text-red-500' : 'text-[var(--color-neon-cyan)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Main Panel */}
            <ThemeCard glowColor="cyan" className="flex-1 flex flex-col justify-center p-8 lg:p-14 mb-8">
                <div className="relative z-10">
                    <h3 className="text-3xl lg:text-5xl font-black mb-14 leading-snug text-white tracking-tight">
                        {currentQ?.questionText}
                    </h3>

                    <div className="space-y-4 w-full max-w-4xl">
                        {currentQ?.options?.map((opt, i) => {
                            const isSelected = answers[currentIndex] === i;
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(i)}
                                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 flex items-center gap-6 group relative overflow-hidden ${isSelected
                                            ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]/10 text-white shadow-[0_0_30px_rgba(0,243,255,0.15)] scale-[1.01]'
                                            : 'border-white/5 glass-panel text-[var(--color-gray-300)] hover:border-[var(--color-neon-purple)]/50 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-neon-cyan)]/20 to-transparent pointer-events-none"></div>
                                    )}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 transition-colors ${isSelected ? 'bg-[var(--color-neon-cyan)] text-black shadow-[0_0_15px_var(--color-neon-cyan)]' : 'glass-panel text-[var(--color-gray-400)] group-hover:text-[var(--color-neon-purple)] group-hover:border-[var(--color-neon-purple)]'}`}>
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className="text-2xl font-semibold tracking-wide relative z-10">{opt}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </ThemeCard>

            {/* Bottom Nav */}
            <div className="glass-panel flex justify-between items-center mt-auto p-6 rounded-2xl border border-white/10 shadow-2xl">
                <ThemeButton
                    variant="secondary"
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="px-10 py-3 text-lg"
                >
                    &lt; Previous
                </ThemeButton>

                {currentIndex === DEMO_QUESTIONS.length - 1 ? (
                    <ThemeButton variant="primary" onClick={handleSubmit} className="px-12 py-3 text-lg bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                        INITIATE SUBMISSION Sequence
                    </ThemeButton>
                ) : (
                    <ThemeButton
                        variant="cyan"
                        onClick={() => setCurrentIndex(prev => Math.min(DEMO_QUESTIONS.length - 1, prev + 1))}
                        className="px-12 py-3 text-lg"
                    >
                        Next &gt;
                    </ThemeButton>
                )}
            </div>
        </div>
    );
}
