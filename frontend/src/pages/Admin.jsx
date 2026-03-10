import React, { useState, useEffect } from 'react';
import { ThemeCard } from '../components/ui/ThemeCard';
import { ThemeButton } from '../components/ui/ThemeButton';
import { useSocket } from '../SocketContext';
import { getCurrentUser } from '../lib/appwrite';
import { useNavigate } from 'react-router-dom';
import { Send, Trophy, Clock, Users, EyeOff, CheckCircle, Zap, Lock } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import Round3Admin from '../round3/Round3Admin';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Admin() {
    const { socket, isConnected } = useSocket();
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timerMinutes, setTimerMinutes] = useState(90); // Default 90 minutes
    const [isCalculating, setIsCalculating] = useState(false);

    // Global Admin Tab State
    const [activeTab, setActiveTab] = useState('A'); // 'A' or 'B'

    // Round 2 Admin States
    const [topNTeams, setTopNTeams] = useState(20);
    const [isQualifying, setIsQualifying] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);

    // Round B - FastFingers State
    const [questions, setQuestions] = useState([]);
    const [activeQuestionId, setActiveQuestionId] = useState(null);
    const [clients, setClients] = useState([]);
    const [winnerFound, setWinnerFound] = useState(false);

    const [showProfile, setShowProfile] = useState(true);
    const [cheatAlerts, setCheatAlerts] = useState([]);
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

            // Listen for anti-cheat alerts
            socket.on('server:cheat_alert', (data) => {
                setCheatAlerts(prev => [data, ...prev].slice(0, 10)); // Keep last 10
            });

            // Sync global state including visibility
            socket.on('server:sync_state', (state) => {
                if (state.showProfile !== undefined) {
                    setShowProfile(state.showProfile);
                }
            });

            // Initial state request
            socket.emit('client:request_state');

            // Fetch Round 2 questions implicitly (they can be fetched regardless of tab)
            socket.emit('admin:round2:fetch_questions');

            socket.on('server:round2:questions_list', (data) => {
                setQuestions(data);
            });

            socket.on('leaderboard:update', (data) => {
                const formatted = data.answers.map(ans => ({
                    id: ans.id,
                    name: ans.client.name,
                    time: `${ans.timeTaken}s`,
                    answer: ans.numericAnswer,
                    correct: ans.isCorrect
                }));
                setClients(formatted);
                setWinnerFound(data.winnerFound);
            });

            // Listen for winner explicitly
            socket.on('server:round2:winner_found', (data) => {
                setWinnerFound(true);
            });
        }

        return () => {
            if (socket) {
                socket.off('server:results_calculated');
                socket.off('server:round2:questions_list');
                socket.off('leaderboard:update');
                socket.off('server:round2:winner_found');
                socket.off('server:sync_state');
                socket.off('server:cheat_alert');
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

    const handleQualifyTeams = async () => {
        if (!window.confirm(`Are you sure you want to grant Round 2 Access to the Top ${topNTeams} Teams?`)) return;
        setIsQualifying(true);
        try {
            const res = await fetch('/api/round2/qualify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n: parseInt(topNTeams) })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                if (data.qualifiedTeams && data.qualifiedTeams.length > 0) {
                    generateQualifiedTeamsPDF(data.qualifiedTeams);
                }
            } else alert('Error: ' + data.error);
        } catch (error) {
            console.error(error);
            alert('Failed to connect to qualification server.');
        } finally {
            setIsQualifying(false);
        }
    };

    const generateQualifiedTeamsPDF = (qualifiedTeams) => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text('Qualified Teams - Round 1 to Round 2', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        // Prepare table data
        const tableColumn = ["#", "Team Name", "Member Name", "Email ID", "Total Score"];
        const tableRows = [];

        qualifiedTeams.forEach((team, index) => {
            const teamData = [
                index + 1,
                team.team_name,
                team.full_name,
                team.email,
                team.total_score || 0
            ];
            tableRows.push(teamData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [188, 19, 254] }, // Neon Purple color match
            styles: { fontSize: 9 }
        });

        doc.save(`Qualified_Teams_Round2_${new Date().getTime()}.pdf`);
    };

    const handleRevokeAll = async () => {
        if (!window.confirm(`WARNING: Are you sure you want to REVOKE Round 2 Access from ALL users?`)) return;
        setIsRevoking(true);
        try {
            const res = await fetch('/api/round2/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (res.ok) alert(data.message);
            else alert('Error: ' + data.error);
        } catch (error) {
            console.error(error);
            alert('Failed to connect to revocation server.');
        } finally {
            setIsRevoking(false);
        }
    };

    const handleSendQuestion = (id) => {
        if (socket) {
            socket.emit('admin:round2:push_question', { id });
            setActiveQuestionId(id);
        }
    };

    const handleHideQuestion = () => {
        if (socket) {
            socket.emit('admin:round2:hide_question');
            setActiveQuestionId(null);
            setClients([]);
            setWinnerFound(false);
        }
    };

    const handleVisibilityToggle = () => {
        if (socket && isConnected) {
            const newState = !showProfile;
            socket.emit('admin:toggle_profile_visibility', { showProfile: newState });
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
        <div className="max-w-[95vw] lg:max-w-[90vw] mx-auto mt-10 p-4 animate-in fade-in duration-500">
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
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full border border-[var(--color-neon-cyan)]/20 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-bold text-[var(--color-gray-200)] tracking-wider">
                            {isConnected ? 'LIVE SYNC' : 'OFFLINE'}
                        </span>
                    </div>
                </div>
            </div>

            {winnerFound && activeTab === 'B' && (
                <div className="mb-8 w-full bg-green-500/10 border border-green-500/50 p-4 rounded-xl flex items-center justify-center gap-3 animate-pulse">
                    <CheckCircle className="text-green-500" size={24} />
                    <h2 className="text-xl font-black text-green-400">WINNER FOUND! Round locked globally.</h2>
                </div>
            )}

            <div className="flex mb-8 bg-black/40 rounded-xl border border-gray-800 overflow-hidden">
                <button
                    onClick={() => setActiveTab('A')}
                    className={`flex-1 py-4 text-center text-lg font-bold transition-all ${activeTab === 'A' ? 'bg-[var(--color-neon-purple)]/20 text-white border-b-2 border-[var(--color-neon-purple)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                    Round 1 (MCQ Prelims)
                </button>
                <button
                    onClick={() => setActiveTab('B')}
                    className={`flex-1 py-4 text-center text-lg font-bold transition-all ${activeTab === 'B' ? 'bg-[var(--color-neon-cyan)]/20 text-white border-b-2 border-[var(--color-neon-cyan)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                    Round 2 (FastFingers)
                </button>
                <button
                    onClick={() => setActiveTab('C')}
                    className={`flex-1 py-4 text-center text-lg font-bold transition-all ${activeTab === 'C' ? 'bg-[var(--color-neon-purple)]/20 text-white border-b-2 border-[var(--color-neon-purple)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                    Round 3 (Buzzer)
                </button>
            </div>

            {/* Real-time Cheat Alerts */}
            {cheatAlerts.length > 0 && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-red-500/20">
                        <h3 className="text-red-500 font-bold flex items-center gap-2">
                            <Lock size={18} /> LIVE ANTI-CHEAT MONITOR
                        </h3>
                        <button
                            onClick={() => setCheatAlerts([])}
                            className="text-xs text-red-500/50 hover:text-red-500 font-bold uppercase tracking-widest"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {cheatAlerts.map((alert, i) => (
                            <div key={i} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-red-500/10 animate-in fade-in slide-in-from-left-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-white font-black">{alert.teamName}</span>
                                    <span className="text-red-400/80 text-sm">violation: {alert.type}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px] font-bold uppercase">Warning #{alert.warningCount}</span>
                                    <span className="text-gray-500 text-xs font-mono">{alert.timestamp}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Master Kill switch ALWAYS available */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <ThemeCard className="flex flex-col h-full border-blue-500/20 hover:border-blue-500/50 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex gap-4 w-full flex-wrap md:flex-nowrap items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-white mb-1">0. Emergency System Reset</h3>
                            <p className="text-[var(--color-gray-400)] text-sm">
                                Terminate current phase and force all participants globally back to the Hub.
                            </p>
                        </div>
                        <ThemeButton
                            variant="secondary"
                            className="w-full md:w-auto shrink-0 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 px-8"
                            onClick={() => handleStageChange('A', 0)}
                            disabled={!isConnected}
                        >
                            Return All to Dashboard
                        </ThemeButton>
                    </div>
                </ThemeCard>

                <ThemeCard className="flex flex-col h-full border-purple-500/20 hover:border-purple-500/50 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex gap-4 w-full flex-wrap md:flex-nowrap items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-white mb-1">Profile Visibility</h3>
                            <p className="text-[var(--color-gray-400)] text-sm">
                                Toggle visibility of User & Team names on the participant dashboard.
                            </p>
                        </div>
                        <ThemeButton
                            variant={showProfile ? "primary" : "secondary"}
                            className={`w-full md:w-auto shrink-0 px-8 flex items-center gap-2 ${showProfile ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}
                            onClick={handleVisibilityToggle}
                            disabled={!isConnected}
                        >
                            {showProfile ? <CheckCircle size={18} /> : <EyeOff size={18} />}
                            {showProfile ? 'Showing' : 'Hidden'}
                        </ThemeButton>
                    </div>
                </ThemeCard>
            </div>

            {activeTab === 'A' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
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

                    {/* Control Panel: Round 2 Qualification */}
                    <ThemeCard className="flex flex-col h-full border-amber-500/20 hover:border-amber-500/50 transition-colors relative overflow-hidden group md:col-span-2">
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

                        <h3 className="text-2xl font-black text-white mb-4 relative z-10 flex items-center gap-2">
                            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Round 2 Access Management
                        </h3>
                        <p className="text-[var(--color-gray-400)] mb-6 relative z-10">
                            Select the top performing teams from the PostgreSQL Leaderboard and automatically grant them access to the Round 2 interfaces by tagging their Appwrite profiles with the <code>round2</code> label.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            {/* Qualify Top N */}
                            <div className="bg-black/40 p-5 rounded-xl border border-amber-500/20 flex flex-col">
                                <label className="block text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wider">Qualify Top Teams</label>
                                <div className="flex gap-3 mb-4">
                                    <input
                                        type="number"
                                        value={topNTeams}
                                        onChange={(e) => setTopNTeams(e.target.value)}
                                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-xl focus:outline-none focus:border-amber-500 text-center"
                                        min="1"
                                    />
                                    <div className="flex-1 flex items-center text-[var(--color-gray-400)] text-sm leading-tight">
                                        Number of top teams from the leaderboard to instantly qualify for Round 2.
                                    </div>
                                </div>
                                <ThemeButton
                                    variant="primary"
                                    className={`w-full mt-auto ${isQualifying ? 'bg-amber-600 cursor-not-allowed' : 'bg-amber-600/20 border-amber-500/50 text-white hover:bg-amber-600 hover:shadow-[0_0_20px_rgba(245,158,11,0.6)]'}`}
                                    onClick={handleQualifyTeams}
                                    disabled={isQualifying}
                                >
                                    {isQualifying ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processing...
                                        </div>
                                    ) : (
                                        `Qualify Top ${topNTeams} Teams`
                                    )}
                                </ThemeButton>
                            </div>

                            {/* Revoke All */}
                            <div className="bg-black/40 p-5 rounded-xl border border-red-500/20 flex flex-col">
                                <label className="block text-sm font-semibold text-red-400 mb-3 uppercase tracking-wider">Emergency Revoke</label>
                                <p className="text-sm text-[var(--color-gray-400)] mb-6">
                                    Strip the <code>round2</code> qualification label from <strong>all users</strong> immediately. Use if a qualification batch was run in error.
                                </p>
                                <ThemeButton
                                    variant="secondary"
                                    className={`w-full mt-auto ${isRevoking ? 'bg-red-900 cursor-not-allowed text-white' : 'border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]'}`}
                                    onClick={handleRevokeAll}
                                    disabled={isRevoking}
                                >
                                    {isRevoking ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            Revoking...
                                        </div>
                                    ) : (
                                        'Revoke All Qualifications'
                                    )}
                                </ThemeButton>
                            </div>
                        </div>
                    </ThemeCard>
                </div>
            ) : activeTab === 'B' ? (
                <div className="space-y-8 animate-in fade-in duration-500">

                    {/* Full Width Stage Control */}
                    <ThemeCard className="border-[var(--color-neon-purple)]/20 shadow-[0_0_15px_rgba(188,19,254,0.05)]">
                        <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2 text-white">
                                    <Users className="text-[var(--color-neon-purple)]" size={24} />
                                    Round 2 Stage Manager
                                </h2>
                                <p className="text-[var(--color-gray-400)] text-sm">
                                    Manage the participant flow between the Hub and the Live Arena.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-4 justify-center md:justify-end w-full md:w-auto">
                                <ThemeButton
                                    variant="primary"
                                    className="bg-[var(--color-neon-purple)]/20 border-[var(--color-neon-purple)]/50 text-white hover:bg-[var(--color-neon-purple)] flex-1 md:flex-none"
                                    onClick={() => handleStageChange('B', 1)}
                                    disabled={!isConnected}
                                >
                                    Push to Hub Dashboard
                                </ThemeButton>
                                <ThemeButton
                                    variant="primary"
                                    className="bg-[var(--color-neon-cyan)]/20 border-[var(--color-neon-cyan)]/50 text-white hover:bg-[var(--color-neon-cyan)] flex-1 md:flex-none"
                                    onClick={() => handleStageChange('B', 2)}
                                    disabled={!isConnected}
                                >
                                    Launch Live Arena
                                </ThemeButton>
                            </div>
                        </div>
                    </ThemeCard>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Question Preview & Deploy Panel */}
                        <div className="xl:col-span-7">
                            <ThemeCard className="border-[var(--color-neon-cyan)]/20 shadow-[0_0_15px_rgba(0,255,255,0.05)] h-[70vh] flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                                        <Send className="text-[var(--color-neon-cyan)]" size={22} />
                                        Question Preview & Control
                                    </h2>
                                    {activeQuestionId && (
                                        <button onClick={handleHideQuestion} className="flex gap-2 flex-shrink-0 items-center text-sm font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 px-4 py-2 rounded hover:bg-amber-500/20 transition-colors uppercase tracking-widest shadow-lg">
                                            <EyeOff size={18} /> Hide Question
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-4 custom-[var(--color-neon-cyan)]-scrollbar pb-10">
                                    {questions.length === 0 ? (
                                        <p className="text-gray-500 text-center py-10 text-lg">No FastFingers questions found.</p>
                                    ) : (
                                        questions.map((q, idx) => (
                                            <div key={q.id} className={`p-6 rounded-xl border transition-all ${activeQuestionId === q.id ? 'bg-[var(--color-neon-cyan)]/10 border-[var(--color-neon-cyan)] shadow-[0_0_20px_rgba(0,255,255,0.15)] ring-1 ring-[var(--color-neon-cyan)]/50' : 'bg-black/40 border-gray-800 hover:border-[var(--color-neon-cyan)]/40'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-xl font-black text-gray-300">Question {idx + 1}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm font-bold bg-black px-4 py-1.5 rounded-full text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/30 tracking-widest uppercase shadow-inner">
                                                            {q.marks || 10} Points
                                                        </span>
                                                        <ThemeButton
                                                            variant={activeQuestionId === q.id ? "primary" : "secondary"}
                                                            className={`px-6 py-2 text-sm font-bold tracking-widest uppercase transition-transform hover:scale-105 ${activeQuestionId === q.id ? 'bg-[var(--color-neon-cyan)]/30 border-[var(--color-neon-cyan)] text-white shadow-[0_0_20px_rgba(0,255,255,0.6)]' : 'border-gray-600 text-gray-300 hover:border-[var(--color-neon-cyan)]'}`}
                                                            onClick={() => handleSendQuestion(q.id)}
                                                            disabled={activeQuestionId && activeQuestionId !== q.id}
                                                        >
                                                            {activeQuestionId === q.id ? 'Live on Screens' : 'Push Live'}
                                                        </ThemeButton>
                                                    </div>
                                                </div>

                                                <div className="text-base leading-relaxed text-gray-200 bg-brand-dark/20 p-5 rounded-xl border border-gray-800/50 break-words font-medium">
                                                    <p className="mb-4 text-gray-400 font-sans tracking-wide">{q.content?.text}</p>
                                                    {q.content?.mathText && (
                                                        <div className="text-lg bg-black/60 p-4 rounded-lg inline-block border border-[var(--color-neon-cyan)]/20 shadow-inner max-w-full overflow-x-auto text-[var(--color-neon-cyan)]">
                                                            <Latex>{q.content.mathText}</Latex>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ThemeCard>
                        </div>

                        {/* Right Panel - Leaderboard */}
                        <div className="xl:col-span-5 flex flex-col">
                            <ThemeCard className="h-[70vh] border-[var(--color-neon-purple)]/20 shadow-[0_0_15px_rgba(188,19,254,0.05)] flex flex-col">
                                <h2 className="text-xl font-bold mb-6 flex items-center justify-between border-b border-gray-800 pb-4 text-white">
                                    <div className="flex flex-row items-center gap-3">
                                        <Trophy className="text-[var(--color-neon-purple)]" size={24} />
                                        <span>Live Feed & Responses</span>
                                    </div>
                                    <span className="text-xs tracking-widest uppercase font-bold text-[var(--color-neon-purple)] bg-[var(--color-neon-purple)]/10 px-3 py-1 rounded-full border border-[var(--color-neon-purple)]/30">
                                        Real-time
                                    </span>
                                </h2>

                                <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-3 custom-scrollbar pb-6">
                                    {clients.length === 0 ? (
                                        <div className="text-center py-20 text-gray-500 font-medium">
                                            Awaiting participant attempts...
                                        </div>
                                    ) : (
                                        clients.map((client, idx) => (
                                            <div
                                                key={`${client.id}-${idx}`}
                                                className={`flex items-center justify-between p-4 rounded-xl border ${client.correct
                                                    ? 'bg-[var(--color-neon-cyan)]/20 border-[var(--color-neon-cyan)] shadow-[0_0_20px_rgba(0,255,255,0.2)]'
                                                    : 'bg-red-500/5 border-red-500/20'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-2xl font-black ${client.correct ? 'text-[var(--color-neon-cyan)]' : 'text-gray-600'}`}>
                                                        #{idx + 1}
                                                    </span>
                                                    <span className={`font-bold text-lg ${client.correct ? 'text-white' : 'text-gray-300'}`}>{client.name}</span>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Guessed</p>
                                                        <p className={`font-mono font-black text-xl ${client.correct ? 'text-white' : 'text-red-400'}`}>
                                                            {client.answer}
                                                        </p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${client.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                                                        {client.correct ? 'CORRECT' : 'INCORRECT'}
                                                    </span>
                                                    <div className={`flex items-center gap-2 font-mono text-lg w-24 justify-end ${client.correct ? 'text-[var(--color-neon-cyan)]' : 'text-gray-500'}`}>
                                                        <Clock size={16} />
                                                        {client.time}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ThemeCard>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'C' ? (
                <Round3Admin />
            ) : null}
        </div>
    );
}
