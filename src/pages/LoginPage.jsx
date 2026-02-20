import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithEmail } from '../lib/appwrite';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';

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

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Please enter your registered email address.');
            return;
        }
        if (!password.trim()) {
            setError('Please enter the team password shared via email.');
            return;
        }

        setIsLoading(true);
        try {
            await loginWithEmail(email.trim(), password);
            // ✅ On success — force a full refresh so App.jsx picks up the session
            window.location.href = '/dashboard';
        } catch (err) {
            console.error('Login error:', err);
            if (err?.code === 401) {
                setError('Invalid credentials. Please check your email and the team password sent to you.');
            } else if (err?.code === 429) {
                setError('Too many login attempts. Please wait a moment and try again.');
            } else {
                setError(err?.message || 'Login failed. Please try again or contact the administrator.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-gray-900 flex items-center justify-center overflow-hidden px-4 py-12">

            {/* ── Floating math symbols background ── */}
            <div className="absolute inset-0 overflow-hidden">
                {SYMBOL_DATA.map((item, i) => (
                    <FloatingSymbol key={i} symbol={item.symbol} style={item.style} />
                ))}
            </div>

            {/* ── Radial glow behind the card ── */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(37,99,235,0.12) 0%, transparent 70%)',
                }}
            />

            {/* ── Login Card ── */}
            <div className="relative z-10 w-full max-w-md">

                {/* Card */}
                <ThemeCard glowColor="cyan" className="p-8 sm:p-10 border border-[var(--color-neon-cyan)]/30 backdrop-blur-2xl">
                    {/* ── Logo / Brand ── */}
                    <div className="flex flex-col items-center mb-8">
                        {/* Logo mark */}
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
                        >
                            <span className="text-white font-extrabold text-2xl tracking-tight">M<span className="text-blue-200">X</span></span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-center">
                            MathX Quiz Portal
                        </h1>
                        <p className="text-gray-400 text-sm mt-1 text-center">
                            National Level Mathematics Examination
                        </p>

                        {/* Divider with badge */}
                        <div className="flex items-center gap-3 mt-4 w-full">
                            <div className="flex-1 h-px bg-gray-700" />
                            <span className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-600/30 text-blue-400 text-xs font-semibold uppercase tracking-widest">
                                Team Login
                            </span>
                            <div className="flex-1 h-px bg-gray-700" />
                        </div>
                    </div>

                    {/* ── Form ── */}
                    <form onSubmit={handleLogin} className="space-y-5" noValidate>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                {/* Icon */}
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                    </svg>
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="team@mathx.in"
                                    autoComplete="email"
                                    required
                                    className="w-full glass-panel border border-[var(--color-neon-cyan)]/30 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[var(--color-gray-500)] text-sm
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-neon-cyan)] focus:border-transparent
                             transition-all duration-200 hover:border-[var(--color-neon-cyan)]/60"
                                />
                            </div>
                        </div>

                        {/* Team Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                                Team Password
                                <span className="ml-2 text-xs text-gray-500 font-normal">(sent to your registered email)</span>
                            </label>
                            <div className="relative">
                                {/* Lock icon */}
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your team password"
                                    autoComplete="current-password"
                                    required
                                    className="w-full glass-panel border border-[var(--color-neon-purple)]/30 rounded-xl pl-10 pr-12 py-3 text-white placeholder-[var(--color-gray-500)] text-sm
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-neon-purple)] focus:border-transparent
                             transition-all duration-200 hover:border-[var(--color-neon-purple)]/60"
                                />
                                {/* Show / hide toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="flex items-start gap-2.5 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="text-red-400 mt-0.5 flex-shrink-0" width="16" height="16">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <ThemeButton
                            id="login-btn"
                            type="submit"
                            disabled={isLoading}
                            variant="primary"
                            className="w-full relative flex items-center justify-center gap-2 py-3 px-4 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Authenticating…
                                </>
                            ) : (
                                <>
                                    Enter Exam Portal
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                                        <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                                    </svg>
                                </>
                            )}
                        </ThemeButton>
                    </form>

                    <p className="mt-6 text-center text-xs text-[var(--color-gray-400)] leading-relaxed">
                        Access is restricted to registered teams only.<br />
                        Contact <span className="text-[var(--color-neon-cyan)]">admin@mathx.in</span> for support.
                    </p>
                </ThemeCard>

                {/* Bottom tag */}
                <p className="mt-5 text-center text-xs text-gray-700">
                    © 2025 MathX · National Level Mathematics Quiz
                </p>
            </div>
        </div>
    );
}
