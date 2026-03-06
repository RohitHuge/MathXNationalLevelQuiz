import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Play, Pause, RotateCcw, ChevronRight, Eye, Plus, Minus, Settings2, Trophy, MonitorUp, List, Clock, Sun, Moon } from 'lucide-react';

export default function AdminDashboard() {
    const { socket, gameState, timer, allQuestions } = useSocket();
    const [roundNameInput, setRoundNameInput] = useState('');
    const [customTimer, setCustomTimer] = useState('');

    if (!gameState) {
        return (
            <div className="flex items-center justify-center min-h-screen text-neon-pink animate-pulse">
                Connecting to Server...
            </div>
        );
    }

    const { teams, activeQuestion, showAnswer, isTimerRunning, currentTeamFor, showLeaderboard, isWaitingForQuestion, theme } = gameState;

    // Handlers
    const handleSelectActiveTeam = (teamId) => {
        const team = teams.find(t => t.id === teamId);
        if (team) {
            socket.emit('adminUpdateState', { currentTeamFor: team });
        }
    };

    const updateTeamScore = (teamId, delta) => {
        const updated = teams.map(t => t.id === teamId ? { ...t, score: t.score + delta } : t);
        let stateUpdates = { teams: updated };
        if (currentTeamFor?.id === teamId) {
            stateUpdates.currentTeamFor = { ...currentTeamFor, score: currentTeamFor.score + delta };
        }
        socket.emit('adminUpdateState', stateUpdates);
    };

    const toggleLeaderboard = () => {
        socket.emit('adminUpdateState', { showLeaderboard: !showLeaderboard, isWaitingForQuestion: false, activeQuestion: null });
    };

    const toggleWaiting = () => {
        socket.emit('adminUpdateState', { isWaitingForQuestion: !isWaitingForQuestion, showLeaderboard: false, activeQuestion: null });
    };

    const handleSetTimer = () => {
        socket.emit('setTimer', parseInt(customTimer, 10) || 60);
        setCustomTimer('');
    };

    return (
        <div className="min-h-screen bg-[#0A0A1F] p-8 font-sans">
            <header className="mb-8 flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue uppercase tracking-widest flex items-center gap-3">
                    <Settings2 className="text-neon-pink" /> MathX Admin Control
                </h1>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder={gameState.roundName}
                        className="bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                        value={roundNameInput}
                        onChange={(e) => setRoundNameInput(e.target.value)}
                    />
                    <button
                        onClick={() => { socket.emit('adminUpdateState', { roundName: roundNameInput }); setRoundNameInput(''); }}
                        className="bg-neon-blue hover:bg-neon-blue/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Update Round
                    </button>
                    <button
                        onClick={() => socket.emit('toggleTheme')}
                        title="Toggle Client Theme"
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center cursor-pointer border border-white/20"
                    >
                        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8 h-[calc(100vh-140px)]">
                {/* Left Col: Timer & Views */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full">
                    {/* Timer Card */}
                    <div className="bg-white/5 p-8 rounded-2xl border border-white/10 flex flex-col items-center flex-shrink-0">
                        <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold mb-6 flex items-center gap-2"><Clock className="w-4 h-4" /> Master Timer</h2>
                        <div className={`text-7xl font-mono font-black mb-8 ${timer <= 10 ? 'text-neon-pink drop-shadow-[0_0_15px_rgba(255,0,255,0.8)]' : 'text-neon-cyan drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]'}`}>
                            {timer}
                        </div>
                        <div className="flex gap-2 mb-6">
                            <button onClick={() => socket.emit('startTimer')} disabled={isTimerRunning} className="bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 p-3 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center">
                                <Play className="w-5 h-5" />
                            </button>
                            <button onClick={() => socket.emit('pauseTimer')} disabled={!isTimerRunning} className="bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 p-3 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center">
                                <Pause className="w-5 h-5" />
                            </button>
                            <button onClick={() => socket.emit('resetTimer')} className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 p-3 rounded-xl transition-all flex items-center justify-center">
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex gap-2 w-full">
                            <input type="number" value={customTimer} onChange={e => setCustomTimer(e.target.value)} placeholder="Secs" className="bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:border-neon-cyan hover:border-white/50 transition-colors" />
                            <button onClick={handleSetTimer} className="bg-white/10 text-white font-medium px-4 rounded-lg hover:bg-white/20 border border-white/20 transition-colors cursor-pointer">Set</button>
                        </div>
                    </div>

                    {/* View Toggles */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 flex-1">
                        <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold mb-2 flex items-center gap-2"><MonitorUp className="w-4 h-4" /> Screen Views</h2>

                        <button
                            onClick={toggleLeaderboard}
                            className={`p-4 rounded-xl font-bold flex items-center justify-between border-2 transition-all cursor-pointer ${showLeaderboard ? 'bg-neon-blue/20 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,136,255,0.5)]' : 'bg-black/30 border-white/10 text-white/70 hover:border-white/30 hover:text-white'}`}
                        >
                            <span className="flex items-center gap-2"><Trophy className="w-5 h-5" /> Leaderboard</span>
                            {showLeaderboard && <span className="text-xs uppercase tracking-widest bg-black/30 px-2 py-1 rounded">Active</span>}
                        </button>

                        <button
                            onClick={toggleWaiting}
                            className={`p-4 rounded-xl font-bold flex items-center justify-between border-2 transition-all cursor-pointer ${isWaitingForQuestion ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.5)]' : 'bg-black/30 border-white/10 text-white/70 hover:border-white/30 hover:text-white'}`}
                        >
                            <span className="flex items-center gap-2"><Settings2 className="w-5 h-5" /> Waiting Screen</span>
                            {isWaitingForQuestion && <span className="text-xs uppercase tracking-widest bg-black/30 px-2 py-1 rounded">Active</span>}
                        </button>
                    </div>
                </div>

                {/* Middle Col: Question Library */}
                <div className="col-span-12 lg:col-span-4 bg-white/5 p-8 rounded-2xl border border-white/10 flex flex-col h-full">
                    <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold mb-6 flex items-center gap-2"><List className="w-4 h-4" /> Question Library</h2>

                    <div className="mb-6 flex-shrink-0">
                        <button
                            onClick={() => socket.emit('revealAnswer')}
                            disabled={showAnswer || !activeQuestion || showLeaderboard || isWaitingForQuestion}
                            className="w-full bg-white/10 text-white font-bold py-4 rounded-xl border border-white/20 hover:bg-white/20 disabled:opacity-50 transition-colors flex justify-center items-center gap-2 uppercase tracking-wide cursor-pointer disabled:cursor-not-allowed"
                        >
                            <Eye className="w-5 h-5" /> Reveal Answer
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {allQuestions?.map((q) => {
                            const isActive = activeQuestion?.id === q.id && !showLeaderboard && !isWaitingForQuestion;
                            return (
                                <div key={q.id} className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${isActive ? 'bg-neon-cyan/20 border-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                                    <div className="text-sm text-white/80 line-clamp-2">Q{q.id}: {q.question.replace(/\$/g, '')}</div>
                                    <button
                                        onClick={() => socket.emit('selectQuestion', q.id)}
                                        disabled={isActive}
                                        className={`py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors border ${isActive ? 'bg-neon-cyan text-black border-neon-cyan cursor-not-allowed' : 'bg-white/5 text-white/70 hover:bg-white/20 hover:text-white border-white/10 cursor-pointer'}`}
                                    >
                                        {isActive ? 'Active on Screen' : 'Send to Screen'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right Col: Teams & Scores */}
                <div className="col-span-12 lg:col-span-4 bg-white/5 p-8 rounded-2xl border border-white/10 flex flex-col h-full">
                    <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold mb-6 flex items-center gap-2"><Trophy className="w-4 h-4" /> Teams & Scoring</h2>

                    <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {teams.map(team => {
                            const isActiveTurn = currentTeamFor?.id === team.id;

                            return (
                                <div
                                    key={team.id}
                                    className={`p-5 rounded-xl border-2 transition-all flex flex-col gap-4 ${isActiveTurn ? 'bg-neon-pink/10 border-neon-pink shadow-[0_0_20px_rgba(255,0,255,0.2)]' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-xl font-bold text-white mb-1">{team.name}</span>
                                            <span className="text-xs text-neon-cyan/80 font-medium">{team.college}</span>
                                        </div>
                                        <div className="bg-black/50 border border-white/10 w-16 h-16 rounded-xl flex items-center justify-center">
                                            <span className="text-2xl font-black text-neon-pink text-glow-pink">{team.score}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <button
                                            onClick={() => handleSelectActiveTeam(team.id)}
                                            className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md border transition-colors cursor-pointer ${isActiveTurn ? 'bg-neon-pink text-white border-transparent' : 'bg-transparent text-white/50 border-white/20 hover:text-white hover:border-white/50'}`}
                                        >
                                            {isActiveTurn ? 'Current Turn' : 'Assign Turn'}
                                        </button>

                                        <div className="flex gap-2">
                                            <button onClick={() => updateTeamScore(team.id, -5)} className="bg-red-500/20 text-red-500 p-1.5 rounded-lg hover:bg-red-500/40 cursor-pointer"><Minus className="w-4 h-4" /></button>
                                            <button onClick={() => updateTeamScore(team.id, 10)} className="bg-green-500/20 text-green-400 p-1.5 rounded-lg hover:bg-green-500/40 cursor-pointer"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
