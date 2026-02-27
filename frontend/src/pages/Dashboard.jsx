import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../SocketContext";
import { logout } from "../lib/appwrite";

const MATH_SYMBOLS = [
    "π", "∑", "∫", "√", "∞", "Δ", "θ", "λ", "μ", "σ",
    "÷", "×", "±", "≠", "≈", "≤", "≥", "∂", "∇", "∈",
    "⊂", "∪", "∩", "∀", "∃", "α", "β", "γ", "φ", "ω",
    "∏", "⊕", "⊗", "ℝ", "ℤ", "ℕ", "∝", "⊥", "∠", "⌊",
    "+", "−", "=", "%", "!", "^", "∮", "⟨", "⟩", "ℂ",
    "sin", "cos", "tan", "log", "lim", "f(x)", "dy/dx", "∑n",
    "x²", "eⁿ", "n!", "∛", "∜"
];

function getRandomSymbol() {
    return MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)];
}

function getRandomColor() {
    const colors = [
        // Soft purple tones
        "rgba(161, 70, 212, 0.45)",
        "rgba(129, 52, 191, 0.35)",
        // Teal / cyan accents
        "rgba(0, 200, 255, 0.4)",
        "rgba(0, 150, 210, 0.3)",
        // Subtle neutral glows
        "rgba(255, 255, 255, 0.12)",
        "rgba(255, 255, 255, 0.08)",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function createSymbol(id, canvasHeight) {
    return {
        id,
        symbol: getRandomSymbol(),
        x: Math.random() * 100,
        y: canvasHeight + Math.random() * 20,
        size: Math.random() * 28 + 14,
        speed: Math.random() * 0.4 + 0.15,
        opacity: Math.random() * 0.5 + 0.2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 1.5,
        delay: Math.random() * 3000,
        drift: Math.random() * 30 - 15,
        driftSpeed: Math.random() * 0.005 + 0.002,
        color: getRandomColor(),
    };
}

function PulsingDot() {
    return (
        <span className="inline-flex items-center ml-2">
            <span className="dot-pulse" style={{ animationDelay: "0s" }}>.</span>
            <span className="dot-pulse" style={{ animationDelay: "0.3s" }}>.</span>
            <span className="dot-pulse" style={{ animationDelay: "0.6s" }}>.</span>
        </span>
    );
}

export default function Dashboard({ user }) {
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [symbols, setSymbols] = useState([]);
    const animationRef = useRef(0);
    const lastTimeRef = useRef(0);
    const symbolIdRef = useRef(0);
    const [showContent, setShowContent] = useState(false);
    const [time, setTime] = useState(new Date());

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/"); // Redirect to auth page or home
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const initSymbols = useCallback(() => {
        const count = 60;
        const initial = [];
        for (let i = 0; i < count; i++) {
            const sym = createSymbol(symbolIdRef.current++, 100);
            sym.y = Math.random() * 120 - 10;
            initial.push(sym);
        }
        setSymbols(initial);
    }, []);


    useEffect(() => {
        initSymbols();
        setTimeout(() => setShowContent(true), 200);
    }, [initSymbols]);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const animate = (timestamp) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const delta = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            setSymbols((prev) => {
                const updated = prev.map((s) => ({
                    ...s,
                    y: s.y - s.speed * (delta / 16),
                    rotation: s.rotation + s.rotationSpeed * (delta / 16),
                    x: s.x + Math.sin(timestamp * s.driftSpeed) * 0.03,
                }));

                const filtered = updated.filter((s) => s.y > -15);

                while (filtered.length < 60) {
                    filtered.push(createSymbol(symbolIdRef.current++, 105));
                }

                return filtered;
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const formattedTime = time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    return (
        <div
            className="fixed inset-0 w-screen h-screen overflow-hidden"
            style={{
                background:
                    "linear-gradient(135deg, #3b0b6d 0%, #180b2b 40%, #031622 70%, #027c96 100%)",
            }}
        >
            {/* Top Right Controls */}
            <div className="absolute top-6 right-6 z-50">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all font-medium text-sm backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                </button>
            </div>

            {/* Animated background symbols */}
            <div className="absolute inset-0 pointer-events-none">
                {symbols.map((s) => (
                    <span
                        key={s.id}
                        className="absolute select-none font-mono whitespace-nowrap"
                        style={{
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            fontSize: `${s.size}px`,
                            opacity: s.opacity,
                            transform: `rotate(${s.rotation}deg)`,
                            color: s.color,
                            textShadow: `0 0 ${s.size * 0.4}px rgba(161, 70, 212, 0.3)`,
                            willChange: "transform, top",
                            transition: "none",
                        }}
                    >
                        {s.symbol}
                    </span>
                ))}
            </div>

            {/* Gradient overlays for depth */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/70" />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle at 20% 0%, rgba(168, 85, 247, 0.35) 0%, transparent 55%)," +
                        "radial-gradient(circle at 80% 100%, rgba(34, 211, 238, 0.35) 0%, transparent 55%)",
                }}
            />

            {/* Main content */}
            <div
                className={`relative z-10 flex h-full flex-col items-center justify-center px-4 transition-all duration-1500 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    }`}
            >
                {/* Glowing background behind heading */}
                <div
                    className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
                    style={{
                        background:
                            "radial-gradient(circle at 40% 30%, rgba(168, 85, 247, 0.7) 0%, transparent 60%)," +
                            "radial-gradient(circle at 70% 70%, rgba(34, 211, 238, 0.5) 0%, transparent 65%)",
                    }}
                />

                {/* Top decorative line */}
                <div className="mb-8 flex items-center gap-4">
                    <div className="h-[1px] w-16 sm:w-24 bg-gradient-to-r from-transparent via-[#a855f7] to-[#22d3ee]" />
                    <div className="w-2 h-2 rotate-45 border border-[#a855f7] bg-[#22d3ee]/40" />
                    <div className="h-[1px] w-16 sm:w-24 bg-gradient-to-l from-transparent via-[#a855f7] to-[#22d3ee]" />
                </div>

                {/* MathX logo text */}
                <div className="mb-3 text-center">
                    <span
                        className="text-lg sm:text-xl tracking-[0.4em] uppercase font-light"
                        style={{ color: "rgba(161, 70, 212, 0.8)" }}
                    >
                        Welcome to
                    </span>
                </div>

                {/* Main heading */}
                <h1 className="text-center mb-2">
                    <span
                        className="block text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none"
                        style={{
                            background:
                                "linear-gradient(120deg, #ffffff 0%, #d1d5db 25%, #a855f7 55%, #22d3ee 85%)",
                            backgroundSize: "220% 220%",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            animation: "gradientShift 5s ease-in-out infinite",
                            filter:
                                "drop-shadow(0 0 35px rgba(168, 85, 247, 0.55)) drop-shadow(0 0 55px rgba(34, 211, 238, 0.45))",
                        }}
                    >
                        MathX
                    </span>
                </h1>

                {/* Subtitle */}
                <h2
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-wide text-center mb-2"
                    style={{
                        color: "white",
                        textShadow: "0 0 30px rgba(161, 70, 212, 0.5), 0 0 60px rgba(161, 70, 212, 0.2)",
                    }}
                >
                    National Level Quiz
                </h2>

                {/* Year badge */}
                <div className="mt-4 mb-8 px-6 py-2 rounded-full border border-[#a855f7]/50 bg-gradient-to-r from-[#1f2937]/80 via-[#1f2937]/60 to-[#0f172a]/80 backdrop-blur-sm shadow-[0_0_25px_rgba(34,211,238,0.25)]">
                    <span className="text-sm sm:text-base tracking-[0.3em] uppercase font-medium text-white/80">
                        Season 2026
                    </span>
                </div>

                {/* Bottom decorative line */}
                <div className="mb-10 flex items-center gap-4">
                    <div className="h-[1px] w-16 sm:w-24 bg-gradient-to-r from-transparent via-[#a855f7] to-[#22d3ee]" />
                    <div className="w-2 h-2 rotate-45 border border-[#22d3ee] bg-[#22d3ee]/40" />
                    <div className="h-[1px] w-16 sm:w-24 bg-gradient-to-l from-transparent via-[#a855f7] to-[#22d3ee]" />
                </div>

                {/* Waiting indicator */}
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-3">
                        {/* Spinner */}
                        <div className="relative w-10 h-10">
                            <div
                                className="absolute inset-0 rounded-full border-2 border-transparent"
                                style={{
                                    borderTopColor: "#a855f7",
                                    borderRightColor: "rgba(168, 85, 247, 0.4)",
                                    animation: "spin 1.2s linear infinite",
                                }}
                            />
                            <div
                                className="absolute inset-1.5 rounded-full border-2 border-transparent"
                                style={{
                                    borderBottomColor: "#22d3ee",
                                    borderLeftColor: "rgba(34, 211, 238, 0.45)",
                                    animation: "spin 1.8s linear infinite reverse",
                                }}
                            />
                        </div>
                        <span className="text-white/80 text-lg font-light tracking-wide">
                            The quiz will begin shortly
                            <PulsingDot />
                        </span>
                    </div>

                    {/* Current time */}
                    <div className="text-sm font-mono tracking-widest" style={{ color: "rgba(226,232,240,0.8)" }}>
                        {formattedTime}
                    </div>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-8 flex flex-col items-center gap-2">
                    <p className="text-white/30 text-xs tracking-[0.2em] uppercase">
                        Please wait for the host to start
                    </p>
                    <div className="flex gap-1.5 mt-2">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                    background:
                                        "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
                                    boxShadow:
                                        "0 0 10px rgba(168,85,247,0.6), 0 0 18px rgba(34,211,238,0.7)",
                                    animation: `bounce-dot 1.4s ease-in-out ${i * 0.15}s infinite`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
