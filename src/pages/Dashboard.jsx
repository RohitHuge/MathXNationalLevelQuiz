import React, { useState, useEffect } from 'react';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';
import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/appwrite';

export default function Dashboard({ user }) {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Floating math symbols for background
    const MATH_SYMBOLS = ['∑', 'π', '∞', '√', '∫', 'Δ', 'θ', 'λ', '±', '≡', 'φ', 'Ω', '∂', '∇', '∈'];

    function FloatingSymbol({ symbol, style }) {
        return (
            <span
                className="absolute select-none text-blue-400 font-bold pointer-events-none"
                style={style}
                aria-hidden="true"
            >
                {symbol}
            </span>
        );
    }

    // Pre-generated positions so they don't re-randomize on render
    const SYMBOL_DATA = MATH_SYMBOLS.map((sym, i) => ({
        symbol: sym,
        style: {
            top: `${5 + (i * 6.2) % 90}%`,
            left: `${3 + (i * 7.3) % 94}%`,
            fontSize: `${1.2 + (i % 4) * 0.5}rem`,
            opacity: 0.07 + (i % 5) * 0.025,
            animation: `float ${5 + (i % 4) * 2}s ease-in-out ${i * 0.6}s infinite`,
        },
    }));

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative min-h-[calc(100vh-100px)] w-full max-w-6xl mx-auto overflow-hidden">
            {/* ── Floating math symbols background ── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {SYMBOL_DATA.map((item, i) => (
                    <FloatingSymbol key={i} symbol={item.symbol} style={item.style} />
                ))}
            </div>

            <div className="relative z-10 w-full mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4">
                <div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Examination <span className="text-blue-500">Terminal</span></h2>
                    <p className="text-[var(--color-gray-400)] text-lg">
                        Welcome to MathX. Select a simulation to begin.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="bg-slate-800 border border-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_var(--color-blue-500)]"></div>
                        <span className="text-sm font-bold text-blue-400 tracking-widest uppercase">System Online</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    <div className="text-[var(--color-neon-cyan)] animate-pulse col-span-full font-medium flex items-center gap-3">
                        <div className="w-6 h-6 border-2 border-t-[var(--color-neon-cyan)] border-r-[var(--color-neon-cyan)] border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        Loading available simulations...
                    </div>
                ) : (
                    <ThemeCard glowColor="purple" className="flex flex-col group hover:-translate-y-2">
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 glass-panel rounded-xl text-[var(--color-neon-purple)] group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <span className="glass-panel text-[var(--color-neon-cyan)] text-xs font-black px-4 py-1.5 rounded-full border border-[var(--color-neon-cyan)]/30 tracking-widest uppercase shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                                    Live
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white leading-tight mb-3">MathX Nationals Demo 2026</h3>
                            <p className="text-[var(--color-gray-400)] text-sm mb-8 leading-relaxed">
                                Test your skills with this immersive simulation test. Features algorithmic challenges and calculus operations.
                            </p>

                            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-white/10">
                                <div className="flex items-center gap-2 text-sm text-[var(--color-gray-300)] font-medium">
                                    <svg className="w-4 h-4 text-[var(--color-neon-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    15 Min
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[var(--color-gray-300)] font-medium">
                                    <svg className="w-4 h-4 text-[var(--color-neon-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    3 Tasks
                                </div>
                            </div>
                        </div>
                        <ThemeButton
                            variant="primary"
                            className="w-full text-lg shadow-[0_0_25px_rgba(0,102,255,0.4)]"
                            onClick={() => navigate(`/waiting-room/demo`)}
                        >
                            Enter Simulation
                        </ThemeButton>
                    </ThemeCard>
                )}
            </div>
        </div>
    );
}
