import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';
import { animate, stagger } from 'animejs';
import { useSocket } from '../SocketContext';

const MATH_SYMBOLS = ['∑', 'π', '∞', '√', '∫', 'Δ', 'θ', 'λ', '±', '≡', 'φ', 'Ω', '∂', '∇', '∈'];
const SYMBOL_COUNT = 80;

// Generate rich 3D star-gate positioning
const SYMBOL_DATA = Array.from({ length: SYMBOL_COUNT }).map((_, i) => {
    // Distribute in a cylinder/tube using polar coordinates
    const theta = Math.random() * Math.PI * 2;
    // Keep them out of the exact center, so the user flies "through" them
    const radius = 250 + Math.random() * 800;

    // Deep Z distribution
    const zDepth = -3000 + Math.random() * 4000;

    // Glowing intense colors for cinematic visual
    const colors = [
        'var(--color-neon-cyan)',
        'var(--color-neon-purple)',
        'var(--color-neon-blue)',
        'rgba(255, 255, 255, 0.8)'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    return {
        id: i,
        symbol: MATH_SYMBOLS[i % MATH_SYMBOLS.length],
        color,
        theta,
        radius,
        zDepth,
        fontSize: 1.5 + Math.random() * 3
    };
});



export default function WaitingRoom({ user }) {
    const navigate = useNavigate();
    const { socket } = useSocket();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Establishing Secure Connection...');

    const quizDetails = {
        $id: 'demo',
        title: 'MathX National Level Quiz 2026',
        description: 'A prestigious national-level assessment conceptualized to evaluate pinnacle mathematical intuition, advanced algebraic manipulation, and high-order logic operations within a highly secure virtual environment.',
        duration: 60,
        questionCount: 50
    };


    useEffect(() => {
        setTimeout(() => setStatus('Loading Simulator Data...'), 600);
        setTimeout(() => setStatus('Initializing Testing Environment...'), 1200);
        setTimeout(() => {
            setLoading(false);
        }, 2000);

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
    }, []);

    return (
        <div className="relative min-h-[calc(100vh-100px)] w-full overflow-hidden bg-black/40">
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

            <div className="max-w-5xl mx-auto mt-6 px-4 relative z-10 backdrop-blur-[2px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/5">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 glass-panel rounded-2xl flex items-center justify-center border border-[var(--color-neon-cyan)]/50 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                            <svg className="w-7 h-7 text-[var(--color-neon-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tight">Pre-Flight <span className="text-gradient">Briefing</span></h2>
                            <p className="text-sm text-[var(--color-neon-cyan)] mt-2 tracking-widest uppercase font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)] animate-ping"></span>
                                Candidate: {user.name} // Status: Pending
                            </p>
                        </div>
                    </div>
                </div>

                <ThemeCard glowColor="blue" className="relative mb-6 !p-0">
                    {/* Decorative Graphic Background */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[var(--color-neon-purple)]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-[var(--color-neon-cyan)]/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

                    {loading ? (
                        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-8 relative z-10">
                            <div className="relative w-24 h-24">
                                <div className="absolute inset-0 rounded-full border-2 border-white/5"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-neon-cyan)] border-r-[var(--color-neon-purple)] animate-spin" style={{ animationDuration: '1.5s' }}></div>
                                <div className="absolute inset-4 rounded-full border-2 border-transparent border-b-[var(--color-neon-blue)] border-l-[var(--color-neon-cyan)] animate-spin-reverse" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                                </div>
                            </div>
                            <p className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-purple)] font-mono text-xl animate-pulse tracking-widest uppercase font-bold">{status}</p>
                        </div>
                    ) : (
                        <div className="relative z-10 p-8 lg:p-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
                            <div className="mb-12">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                                    <h3 className="text-4xl font-black text-white leading-tight">{quizDetails.title}</h3>
                                    {/* <span className="glass-panel text-[var(--color-neon-cyan)] text-sm font-black px-5 py-2 rounded-full uppercase tracking-widest border border-[var(--color-neon-cyan)]/30 shadow-[0_0_15px_rgba(0,243,255,0.2)] whitespace-nowrap">
                                        SIMULATION
                                    </span> */}
                                </div>
                                <p className="text-[var(--color-gray-300)] text-lg leading-relaxed max-w-4xl font-medium">
                                    {quizDetails.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                                <div className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-[var(--color-neon-purple)]/50 transition-colors group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-neon-purple)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-[var(--color-neon-purple)]/20 transition-colors text-white group-hover:text-[var(--color-neon-purple)]">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="text-xs text-[var(--color-gray-400)] uppercase font-bold tracking-wider">Time Limit</div>
                                        </div>
                                        <div className="text-3xl font-black text-white">{quizDetails.duration} <span className="text-base font-medium text-[var(--color-gray-500)]">min</span></div>
                                    </div>
                                </div>

                                <div className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-[var(--color-neon-cyan)]/50 transition-colors group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-neon-cyan)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-[var(--color-neon-cyan)]/20 transition-colors text-white group-hover:text-[var(--color-neon-cyan)]">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="text-xs text-[var(--color-gray-400)] uppercase font-bold tracking-wider">Questions</div>
                                        </div>
                                        <div className="text-3xl font-black text-white">{quizDetails.questionCount}</div>
                                    </div>
                                </div>

                                <div className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-colors relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-lg bg-white/5 text-white">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="text-xs text-[var(--color-gray-400)] uppercase font-bold tracking-wider">Passing</div>
                                        </div>
                                        <div className="text-3xl font-black text-[var(--color-gray-500)]">N/A</div>
                                    </div>
                                </div>

                                <div className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-[var(--color-neon-blue)]/50 transition-colors group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-neon-blue)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-lg bg-white/5 text-[var(--color-neon-blue)]">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="text-xs text-[var(--color-gray-400)] uppercase font-bold tracking-wider">Connection</div>
                                        </div>
                                        <div className="text-2xl font-black text-[var(--color-neon-blue)] flex items-center gap-3">
                                            Secure <div className="w-2.5 h-2.5 bg-[var(--color-neon-cyan)] rounded-full animate-pulse shadow-[0_0_10px_var(--color-neon-cyan)]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 glass-panel rounded-2xl border-l-[6px] border-[var(--color-neon-purple)] mb-12 shadow-lg relative overflow-hidden">
                                <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
                                    <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h4 className="text-white font-black text-xl mb-6 flex items-center gap-3 relative z-10 tracking-wide uppercase">
                                    <div className="p-2 bg-[var(--color-neon-purple)]/20 rounded-lg">
                                        <svg className="w-6 h-6 text-[var(--color-neon-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    Candidate Directives
                                </h4>
                                <ul className="text-[var(--color-gray-200)] space-y-4 relative z-10 text-lg">
                                    <li className="flex items-start gap-4">
                                        <div className="mt-2 w-2 h-2 rounded-full bg-[var(--color-neon-cyan)] shadow-[0_0_8px_var(--color-neon-cyan)] shrink-0"></div>
                                        <span>Ensure you have a stable network connection before proceeding. Offline progression is restricted.</span>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="mt-2 w-2 h-2 rounded-full bg-[var(--color-neon-cyan)] shadow-[0_0_8px_var(--color-neon-cyan)] shrink-0"></div>
                                        <span>The timer operates server-side. It cannot be paused or stopped once the protocol is initiated.</span>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="mt-2 w-2 h-2 rounded-full bg-[var(--color-red-500)] shadow-[0_0_8px_var(--color-red-500)] shrink-0"></div>
                                        <span className="text-[var(--color-gray-300)]"><strong className="text-white">DO NOT</strong> refresh the page or navigate away during the examination, as this will result in immediate termination.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/10 pt-8">
                                <span className="text-sm font-mono text-[var(--color-neon-cyan)]/70 hidden sm:flex items-center gap-2 uppercase tracking-widest font-bold">
                                    <div className="w-2 h-2 border border-[var(--color-neon-cyan)] rounded-full animate-ping"></div>
                                    Awaiting launch authorization...
                                </span>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <ThemeButton onClick={() => navigate('/dashboard')} variant="secondary" className="w-full sm:w-auto px-8">
                                        Abort
                                    </ThemeButton>
                                    {/* <ThemeButton onClick={() => navigate(`/quiz/${id}`)} variant="primary" className="w-full sm:w-auto px-12 py-4 text-xl tracking-widest">
                                        BEGIN TERMINAL PROTOCOL
                                    </ThemeButton> */}
                                </div>
                            </div>
                        </div>
                    )}
                </ThemeCard>
            </div>
        </div>
    );
}
