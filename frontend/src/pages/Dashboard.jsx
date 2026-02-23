import React, { useState, useEffect } from 'react';
import { ThemeButton } from '../components/ui/ThemeButton';
import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/appwrite';
import { animate, stagger } from 'animejs';

const MATH_SYMBOLS = ['∑', 'π', '∞', '√', '∫', 'Δ', 'θ', 'λ', '±', '≡', 'φ', 'Ω', '∂', '∇', '∈'];
const SYMBOL_COUNT = 80;

const SYMBOL_DATA = Array.from({ length: SYMBOL_COUNT }).map((_, i) => {
    const theta = Math.random() * Math.PI * 2;
    const radius = 250 + Math.random() * 800;
    const zDepth = -3000 + Math.random() * 4000;
    const colors = ['var(--color-neon-cyan)', 'var(--color-neon-purple)', 'var(--color-neon-blue)', 'rgba(255, 255, 255, 0.8)'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return { id: i, symbol: MATH_SYMBOLS[i % MATH_SYMBOLS.length], color, theta, radius, zDepth, fontSize: 1.5 + Math.random() * 3 };
});

export default function Dashboard({ user }) {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();



    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);

        const container = document.querySelector('.portal-container');
        if (container && container.children.length === 0) {
            SYMBOL_DATA.forEach(data => {
                const x = Math.cos(data.theta) * data.radius;
                const y = Math.sin(data.theta) * data.radius;

                const span = document.createElement('span');
                span.className = 'anime-symbol absolute top-1/2 left-1/2 select-none font-black pointer-events-none';
                span.style.color = data.color;
                span.style.fontSize = `${data.fontSize}rem`;
                span.style.textShadow = `0 0 15px ${data.color}`;
                span.style.willChange = 'transform, opacity';
                span.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${data.zDepth}px) rotateZ(${Math.random() * 360}deg)`;
                span.style.opacity = '0';
                span.textContent = data.symbol;

                container.appendChild(span);
            });

            animate('.portal-container', {
                rotateZ: [0, 360],
                duration: 120000,
                loop: true,
                ease: 'linear'
            });

            animate('.anime-symbol', {
                translateZ: '+=3500px',
                opacity: [
                    { to: 0, duration: 0 },
                    { to: 0.8, duration: 1500, ease: 'outSine' },
                    { to: 0, duration: 1500, delay: 2000, ease: 'inSine' }
                ],
                duration: () => 5000 + Math.random() * 3000,
                loop: true,
                delay: stagger(30, { start: 0 }),
                ease: 'linear'
            });
        }

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative min-h-[calc(100vh-100px)] w-full max-w-6xl mx-auto overflow-hidden bg-black/40">
            {/* ── Cinematic Portal Background ── */}
            <div
                className="fixed inset-0 overflow-hidden pointer-events-none z-0"
                style={{
                    perspective: '1000px',
                    perspectiveOrigin: '50% 50%',
                    background: 'radial-gradient(circle at center, transparent 0%, #000 80%)'
                }}
            >
                <div className="portal-container w-full h-full relative" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
                </div>
            </div>

            <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-[70vh] text-center px-4 mt-12 md:mt-24">
                {/* Status Badge */}
                <div className="mb-8 bg-slate-900/60 backdrop-blur-md border border-[var(--color-neon-cyan)]/30 px-6 py-2.5 rounded-full flex items-center gap-3 inline-flex shadow-[0_0_20px_rgba(0,102,255,0.2)] hover:scale-105 transition-transform cursor-default">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-neon-cyan)] animate-ping absolute opacity-75"></div>
                    <div className="w-3 h-3 rounded-full bg-[var(--color-neon-cyan)] shadow-[0_0_10px_var(--color-neon-cyan)] relative z-10"></div>
                    <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-blue)] tracking-widest uppercase">
                        Terminal System Online
                    </span>
                </div>

                {/* Main Hero Header */}
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white mb-6 tracking-tighter leading-none drop-shadow-2xl">
                    NATIONAL LEVEL<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] via-[var(--color-neon-cyan)] to-[var(--color-neon-blue)]" style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                        QUIZ 2026
                    </span>
                </h1>

                <p className="text-[var(--color-gray-300)] text-xl md:text-2xl max-w-2xl mx-auto font-medium mb-12 drop-shadow-lg">
                    An exclusive, prestigious assessment designed to evaluate elite mathematical intuition on a national scale.
                </p>

                {loading ? (
                    <div className="flex flex-col items-center gap-4 mt-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-neon-cyan)]/20"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-neon-cyan)] animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[var(--color-neon-purple)]" style={{ animation: 'spin 1.5s linear infinite reverse' }}></div>
                        </div>
                        <span className="text-[var(--color-neon-cyan)] font-mono tracking-widest uppercase font-bold text-sm animate-pulse">Initializing Environment...</span>
                    </div>
                ) : (
                    <div className="mt-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <ThemeButton
                            variant="primary"
                            className="px-12 py-5 text-xl md:text-2xl tracking-widest font-black uppercase shadow-[0_0_40px_rgba(0,102,255,0.6)] hover:shadow-[0_0_60px_rgba(0,243,255,0.8)] transition-all hover:scale-105 group rounded-2xl"
                            onClick={() => navigate(`/waiting-room/demo`)}
                        >
                            <span className="flex items-center gap-4 relative z-10">
                                ENTER SIMULATION
                                <svg className="w-7 h-7 group-hover:translate-x-3 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </span>
                        </ThemeButton>
                    </div>
                )}
            </div>
        </div>
    );
}
