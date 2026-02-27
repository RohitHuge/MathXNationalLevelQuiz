import React, { useState, useEffect } from 'react';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';
import { useSocket } from '../SocketContext';
import { getCurrentUser } from '../lib/appwrite';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
    const { socket, isConnected } = useSocket();
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timerMinutes, setTimerMinutes] = useState(90); // Default 90 minutes
    const [isCalculating, setIsCalculating] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        checkAdmin();

        if (socket) {
            socket.on('server:results_calculated', (response) => {
                setIsCalculating(false);
                if (response.success) {
                    alert('Final Results successfully calculated and saved to the database!');
                } else {
                    alert('Error calculating results: ' + response.error);
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('server:results_calculated');
            }
        };
    }, [socket]);

    const checkAdmin = async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            // Check if user has the admin label mapped in Appwrite
            if (currentUser.labels && currentUser.labels.includes('admin')) {
                setIsAdmin(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStageChange = (round, stage) => {
        if (socket && isConnected) {
            let endTime = null;
            if (stage === 2 && timerMinutes > 0) {
                // Calculate UTC exact end time for the synchronized countdown
                // new Date(Date.now() + milliseconds)
                endTime = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();
            }
            socket.emit('admin:change_stage', { round, stage, endTime });
        }
    };

    const handleCalculateResults = () => {
        if (window.confirm("Are you sure you want to calculate final results? This will overwrite the current individual and team scores based on the latest responses.")) {
            setIsCalculating(true);
            socket.emit('admin:calculate_results');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-[var(--color-neon-cyan)]/30 border-t-[var(--color-neon-cyan)] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="max-w-4xl mx-auto mt-10 p-4">
                <ThemeCard className="border-red-500/30 bg-red-500/5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-500/10 rounded-lg shrink-0">
                            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-red-500 mb-1">Access Restricted</h3>
                            <p className="text-[var(--color-gray-300)] font-medium leading-relaxed">
                                You do not have the necessary administrator privileges to access this controller panel.
                            </p>
                            <ThemeButton variant="secondary" className="mt-4" onClick={() => navigate('/dashboard')}>
                                Return to Dashboard
                            </ThemeButton>
                        </div>
                    </div>
                </ThemeCard>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto mt-10 p-4 animate-in fade-in duration-500">
            <div className="mb-8 flex justify-between items-end border-b border-gray-800 pb-4">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <svg className="w-8 h-8 text-[var(--color-neon-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Global Controller
                    </h2>
                    <p className="text-[var(--color-gray-400)]">Administer participant screen stages.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full border border-[var(--color-neon-cyan)]/20 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-bold text-[var(--color-gray-200)] tracking-wider">
                        {isConnected ? 'LIVE SYNC' : 'OFFLINE'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Control Panel: Waiting Room */}
                <ThemeCard className="flex flex-col h-full border-[var(--color-neon-purple)]/20 hover:border-[var(--color-neon-purple)]/50 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-neon-purple)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-2xl font-black text-white mb-4 relative z-10">1. Pre-Flight</h3>
                    <p className="text-[var(--color-gray-400)] mb-8 relative z-10 flex-grow">
                        Force all logged-in users sitting in the Dashboard portal into the formal Waiting Room interface.
                    </p>
                    <ThemeButton
                        variant="primary"
                        className="w-full bg-[var(--color-neon-purple)]/20 border-[var(--color-neon-purple)]/50 text-white hover:bg-[var(--color-neon-purple)] hover:shadow-[0_0_20px_var(--color-neon-purple)]"
                        onClick={() => handleStageChange('A', 1)}
                        disabled={!isConnected}
                    >
                        Push to Waiting Room
                    </ThemeButton>
                </ThemeCard>

                {/* Control Panel: Quiz Start & Timer */}
                <ThemeCard className="flex flex-col h-full border-[var(--color-neon-cyan)]/20 hover:border-[var(--color-neon-cyan)]/50 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-neon-cyan)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-2xl font-black text-white mb-4 relative z-10">2. Launch Quiz</h3>
                    <p className="text-[var(--color-gray-400)] mb-4 relative z-10">
                        Execute the simulation. All users currently holding in the Waiting Room will be teleported into Quiz Arena.
                    </p>

                    <div className="relative z-10 mb-8 bg-black/40 p-4 rounded-xl border border-[var(--color-neon-cyan)]/10">
                        <label className="block text-sm font-semibold text-[var(--color-neon-cyan)] mb-3">Quiz Duration (Minutes)</label>
                        <div className="flex flex-col gap-3">
                            <input
                                type="number"
                                value={timerMinutes}
                                onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-xl focus:outline-none focus:border-[var(--color-neon-cyan)]"
                                min="1"
                            />
                            <div className="flex gap-2 justify-between">
                                {[15, 30, 60, 90].map(mins => (
                                    <button
                                        key={mins}
                                        onClick={() => setTimerMinutes(mins)}
                                        className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${timerMinutes === mins
                                            ? 'bg-[var(--color-neon-cyan)] text-slate-900 shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                                            : 'bg-slate-800 text-[var(--color-neon-cyan)] hover:bg-slate-700'
                                            }`}
                                    >
                                        {mins}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <ThemeButton
                        variant="primary"
                        className="w-full mt-auto"
                        onClick={() => handleStageChange('A', 2)}
                        disabled={!isConnected}
                    >
                        Commence Simulation
                    </ThemeButton>
                </ThemeCard>

                {/* Control Panel: Reset to Dashboard */}
                <ThemeCard className="flex flex-col h-full border-blue-500/20 hover:border-blue-500/50 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-2xl font-black text-white mb-4 relative z-10">0. System Reset</h3>
                    <p className="text-[var(--color-gray-400)] mb-8 relative z-10 flex-grow">
                        Terminate the current phase and force all participants globally back to the main Hub Dashboard.
                    </p>
                    <ThemeButton
                        variant="secondary"
                        className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                        onClick={() => handleStageChange('A', 0)}
                        disabled={!isConnected}
                    >
                        Return All to Dashboard
                    </ThemeButton>
                </ThemeCard>

                {/* Control Panel: Calculate Results */}
                <ThemeCard className="flex flex-col h-full border-green-500/20 hover:border-green-500/50 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-2xl font-black text-white mb-4 relative z-10">3. Final Results</h3>
                    <p className="text-[var(--color-gray-400)] mb-8 relative z-10 flex-grow">
                        Compile responses to calculate individual participant totals, then aggregate those values into final team scores.
                    </p>
                    <ThemeButton
                        variant="primary"
                        className={`w-full ${isCalculating ? 'bg-green-600 cursor-not-allowed' : 'bg-green-600/20 border-green-500/50 text-white hover:bg-green-600 hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]'}`}
                        onClick={handleCalculateResults}
                        disabled={!isConnected || isCalculating}
                    >
                        {isCalculating ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Calculating...
                            </div>
                        ) : (
                            'Calculate Final Results'
                        )}
                    </ThemeButton>
                </ThemeCard>
            </div>
        </div>
    );
}
