import React, { useState, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { Play, Pause, RotateCcw, MonitorUp, Trophy, Settings2, Eye, EyeOff, Plus, Minus, List, Clock, Zap, Lock, Unlock, Send } from 'lucide-react';
import Latex from 'react-latex-next';

export default function Round3Admin() {
    const { socket, isConnected } = useSocket();
    const [gameState, setGameState] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [selectedSubRound, setSelectedSubRound] = useState(1);
    const [customTimer, setCustomTimer] = useState('');
    const [showTeamEdit, setShowTeamEdit] = useState(false);
    const [tempTeamNames, setTempTeamNames] = useState({});

    // Rapid Fire state
    const [rfSets, setRfSets] = useState([]);
    const [rfSelectedSet, setRfSelectedSet] = useState(null); // set object
    const [rfSelectedTeamId, setRfSelectedTeamId] = useState(null);

    useEffect(() => {
        if (!socket) return;
        socket.on('server:round3:state_update', setGameState);
        socket.on('server:round3:questions_list', setQuestions);
        socket.on('server:round3:timer_tick', (t) => setGameState(prev => prev ? { ...prev, timerTime: t } : prev));
        socket.on('server:round3:rf_sets_loaded', setRfSets);
        socket.emit('admin:round3:fetch_questions', 1);
        socket.emit('admin:round3:request_state');

        return () => {
            socket.off('server:round3:state_update');
            socket.off('server:round3:questions_list');
            socket.off('server:round3:timer_tick');
            socket.off('server:round3:rf_sets_loaded');
        };
    }, [socket]);

    if (!gameState) {
        return (
            <div className="flex items-center justify-center p-12 text-[var(--color-neon-pink)] animate-pulse">
                Connecting to Server...
            </div>
        );
    }

    const { activeQuestion, timerTime, isTimerRunning, buzzerLocked, buzzerQueue, passCount, teams, clientFontSize, allocatedTeamId, showTimer } = gameState;

    const handleSubRoundChange = (round) => {
        setSelectedSubRound(round);
        if (round === 5) {
            socket.emit('admin:round3:rf_load_sets');
        } else {
            socket.emit('admin:round3:fetch_questions', round);
        }
    };

    const handleStageChange = (stageNum) => {
        socket.emit('admin:change_stage', { round: 'C', stage: stageNum });
        if (stageNum === 2) {
            // Automatically start timer on Launch Projector
            socket.emit('admin:round3:start_timer');
        }
    };

    const handleSetTimer = () => {
        socket.emit('admin:round3:set_timer', parseInt(customTimer, 10) || 60);
        setCustomTimer('');
    };

    const handleApplyTeamNames = () => {
        socket.emit('admin:round3:update_team_names', tempTeamNames);
        setShowTeamEdit(false);
    };

    const initTeamEdit = () => {
        const names = {};
        gameState.teams.forEach(t => {
            names[t.id] = t.name;
        });
        setTempTeamNames(names);
        setShowTeamEdit(true);
    };

    return (
        <div className="font-sans space-y-8 animate-in fade-in duration-500">
            {/* Header Controls */}
            <header className="mb-4 flex flex-col md:flex-row justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] gap-4">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-blue)] uppercase tracking-widest flex items-center gap-3">
                        <Settings2 className="text-[var(--color-neon-pink)]" /> Round 3 Stage Manager
                    </h1>
                    <p className="text-[var(--color-gray-400)] text-sm mt-1 mb-2">
                        Administer the 5 Sub-Rounds for the Buzzer Architecture.
                    </p>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(r => (
                            <button
                                key={r}
                                onClick={() => handleSubRoundChange(r)}
                                className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${selectedSubRound === r ? 'bg-[var(--color-neon-cyan)] text-black shadow-[0_0_10px_rgba(0,255,255,0.5)]' : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                            >
                                SR {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button onClick={() => handleStageChange(1)} className="bg-black/40 border border-[var(--color-neon-cyan)]/30 hover:bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] px-4 py-2 rounded-xl font-bold transition-colors flex-1 md:flex-none">
                        Force Waiting Room
                    </button>
                    <button onClick={() => handleStageChange(2)} className="bg-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/80 text-white px-6 py-2 rounded-xl font-bold shadow-[0_0_15px_rgba(0,136,255,0.4)] transition-colors flex-1 md:flex-none">
                        Launch Projector
                    </button>
                    <button onClick={initTeamEdit} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold border border-white/20 transition-colors flex items-center gap-2">
                        <Settings2 size={16} /> Team Names
                    </button>
                </div>
            </header>

            {/* Team Name Edit Modal/Overlay */}
            {showTeamEdit && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1a1a2e] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <Trophy className="text-[var(--color-neon-cyan)]" /> Register Team Names
                            </h2>
                            <button onClick={() => setShowTeamEdit(false)} className="text-white/50 hover:text-white">&times;</button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 mb-8">
                            {[1, 2, 3, 4, 5, 6].map(id => (
                                <div key={id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                                    <span className="font-mono font-bold text-[var(--color-neon-cyan)] w-6">{id}.</span>
                                    <input
                                        type="text"
                                        value={tempTeamNames[id] || ''}
                                        onChange={e => setTempTeamNames(prev => ({ ...prev, [id]: e.target.value }))}
                                        placeholder={`Team ${id} Name`}
                                        className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:border-[var(--color-neon-cyan)]"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowTeamEdit(false)} className="flex-1 py-3 rounded-xl font-bold bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white transition-all">Cancel</button>
                            <button onClick={handleApplyTeamNames} className="flex-[2] py-3 rounded-xl font-black uppercase tracking-wider bg-[var(--color-neon-cyan)] text-black shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:bg-[var(--color-neon-cyan)]/80 transition-all">Apply Names</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-12 gap-8 h-[calc(100vh-[280px])] min-h-[600px]">
                {/* Left Col: Timer & Hardware Control */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full">
                    {/* Timer Card */}
                    <div className="bg-white/5 p-8 rounded-2xl border border-white/10 flex flex-col items-center flex-shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-neon-cyan)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold mb-6 flex items-center justify-between w-full relative z-10 px-4">
                            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Master Timer</div>
                            <button
                                onClick={() => socket.emit('admin:round3:toggle_timer_visibility')}
                                title={showTimer !== false ? "Hide Timer on Screen" : "Show Timer on Screen"}
                                className={`p-1.5 rounded-lg transition-colors border ${showTimer !== false ? 'bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] border-[var(--color-neon-cyan)]/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}
                            >
                                {showTimer !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                        </h2>
                        <div className={`text-7xl font-mono font-black mb-8 relative z-10 transition-colors ${timerTime <= 10 ? 'text-[var(--color-neon-pink)] drop-shadow-[0_0_15px_rgba(255,0,255,0.8)]' : 'text-[var(--color-neon-cyan)] drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]'}`}>
                            {timerTime}
                        </div>
                        <div className="flex gap-2 mb-6 relative z-10">
                            <button onClick={() => socket.emit('admin:round3:start_timer')} disabled={isTimerRunning} className="bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 p-3 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer">
                                <Play className="w-5 h-5" />
                            </button>
                            <button onClick={() => socket.emit('admin:round3:pause_timer')} disabled={!isTimerRunning} className="bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 p-3 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer">
                                <Pause className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex gap-2 w-full relative z-10">
                            <input type="number" value={customTimer} onChange={e => setCustomTimer(e.target.value)} placeholder="Secs" className="bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:border-[var(--color-neon-cyan)] hover:border-white/50 transition-colors" />
                            <button onClick={handleSetTimer} className="bg-white/10 text-white font-medium px-4 rounded-lg hover:bg-white/20 border border-white/20 transition-colors cursor-pointer">Set</button>
                        </div>
                    </div>

                    {/* Buzzer Harware Toggles */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col gap-4 flex-1 overflow-hidden relative group">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--color-neon-purple)]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
                        <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold mb-2 flex items-center gap-2 relative z-10"><Zap className="w-4 h-4" /> Hardware State</h2>

                        <div className="flex h-full flex-col justify-center relative z-10">
                            {buzzerLocked ?
                                <button onClick={() => socket.emit('admin:round3:unlock_buzzers')} className="w-full flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl font-black text-lg bg-green-500/10 border-2 border-green-500/50 text-green-500 hover:bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-all">
                                    <Unlock size={32} />
                                    ARM BUZZERS NOW
                                </button>
                                :
                                <button onClick={() => socket.emit('admin:round3:lock_buzzers')} className="w-full flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl font-black text-lg bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse transition-all">
                                    <Lock size={32} />
                                    BUZZERS LIVE - LOCK GLOBALLY
                                </button>
                            }
                        </div>
                    </div>
                </div>

                {/* Middle Col: Question Library OR Rapid Fire Panel */}
                <div className="col-span-12 lg:col-span-4 bg-white/5 p-8 rounded-2xl border border-white/10 flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    {selectedSubRound === 5 ? (
                        /* RAPID FIRE PANEL */
                        <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 custom-scrollbar relative z-10">
                            <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-yellow-400" /> Rapid Fire Control
                            </h2>

                            {/* If RF not active yet — show setup */}
                            {!gameState?.rapidFire?.active ? (
                                <>
                                    {/* Set Selection */}
                                    <div>
                                        <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Select Set</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {rfSets.length === 0 ? (
                                                <div className="col-span-3 text-center text-white/30 text-sm py-4 border border-dashed border-white/10 rounded-xl">
                                                    No SR5 questions found in DB
                                                </div>
                                            ) : rfSets.map(s => (
                                                <button
                                                    key={s.setNumber}
                                                    onClick={() => setRfSelectedSet(s)}
                                                    className={`py-3 rounded-xl font-bold text-sm border transition-all ${rfSelectedSet?.setNumber === s.setNumber
                                                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                                                        : 'bg-black/40 border-white/10 text-white/70 hover:border-white/30'
                                                        }`}
                                                >
                                                    Set {s.setNumber}<br />
                                                    <span className="text-[10px] font-normal text-white/40">{s.count} Qs</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Team Selection */}
                                    <div>
                                        <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Allocate Team</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {gameState?.teams?.map(team => (
                                                <button
                                                    key={team.id}
                                                    onClick={() => setRfSelectedTeamId(team.id)}
                                                    className={`py-2 rounded-xl font-bold text-xs border transition-all ${rfSelectedTeamId === team.id
                                                        ? 'bg-[var(--color-neon-cyan)]/20 border-[var(--color-neon-cyan)] text-[var(--color-neon-cyan)]'
                                                        : 'bg-black/30 border-white/10 text-white/60 hover:border-white/30'
                                                        }`}
                                                >
                                                    {team.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Start Button */}
                                    <button
                                        disabled={!rfSelectedSet || !rfSelectedTeamId}
                                        onClick={() => {
                                            socket.emit('admin:round3:rf_start', {
                                                setNumber: rfSelectedSet.setNumber,
                                                teamId: rfSelectedTeamId,
                                                questions: rfSelectedSet.questions
                                            });
                                        }}
                                        className="w-full py-4 rounded-xl font-black uppercase tracking-wider bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm mt-2"
                                    >
                                        🚀 Start Rapid Fire
                                    </button>
                                </>
                            ) : (
                                /* RF ACTIVE — Answer Input */
                                <>
                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs text-white/40 uppercase tracking-wider mb-1">
                                            <span>Question {Math.min(gameState.rapidFire.questionIndex + 1, gameState.rapidFire.questions.length)} of {gameState.rapidFire.questions.length}</span>
                                            <span>Set {gameState.rapidFire.setNumber} • {gameState.teams?.find(t => t.id === gameState.rapidFire.teamId)?.name}</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                                                style={{ width: `${(gameState.rapidFire.questionIndex / gameState.rapidFire.questions.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {gameState.rapidFire.questionIndex < gameState.rapidFire.questions.length ? (
                                        <>
                                            {/* Current Question Preview */}
                                            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white/80 leading-relaxed">
                                                <div className="text-[10px] text-yellow-400 uppercase tracking-widest mb-2 font-bold">Q{gameState.rapidFire.questionIndex + 1}</div>
                                                <Latex>{gameState.rapidFire.questions[gameState.rapidFire.questionIndex]?.content?.mathText || gameState.rapidFire.questions[gameState.rapidFire.questionIndex]?.content?.text || ''}</Latex>
                                            </div>

                                            {/* MCQ Option Buttons */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {(gameState.rapidFire.questions[gameState.rapidFire.questionIndex]?.content?.options || []).map((opt, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => socket.emit('admin:round3:rf_answer', { selectedOption: idx })}
                                                        className="py-3 px-3 rounded-xl font-bold text-xs border border-white/20 bg-white/5 hover:bg-[var(--color-neon-cyan)]/20 hover:border-[var(--color-neon-cyan)] text-white transition-all flex items-center gap-2"
                                                    >
                                                        <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-lg bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] font-black text-[10px]">{String.fromCharCode(65 + idx)}</span>
                                                        <span className="text-left line-clamp-2"><Latex>{opt}</Latex></span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-green-400 font-bold py-4">All questions answered!</div>
                                    )}

                                    {/* Calculate & Reset */}
                                    <div className="flex gap-2 mt-auto pt-2">
                                        <button
                                            onClick={() => socket.emit('admin:round3:rf_calculate')}
                                            className="flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider bg-green-500 text-black hover:bg-green-400 transition-all"
                                        >
                                            🏆 Calculate Results
                                        </button>
                                        <button
                                            onClick={() => socket.emit('admin:round3:rf_reset')}
                                            className="py-3 px-4 rounded-xl font-bold text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* STANDARD QUESTION LIBRARY */
                        <>
                            <div className="flex justify-between items-center mb-6 relative z-10 w-full">
                                <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold flex items-center gap-2">
                                    <List className="w-4 h-4" /> Question Library
                                </h2>
                                {activeQuestion && selectedSubRound === 3 && (
                                    <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${allocatedTeamId ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
                                        {allocatedTeamId
                                            ? `Base T${allocatedTeamId} (Blocked from Buzzer)`
                                            : 'NO TEAM ALLOCATED'}
                                    </div>
                                )}
                            </div>

                            <div className="mb-6 flex-shrink-0 relative z-10">
                                <button
                                    onClick={() => socket.emit('admin:round3:reveal_answer')}
                                    disabled={!activeQuestion}
                                    className="w-full bg-white/10 text-white font-bold py-4 rounded-xl border border-white/20 hover:bg-white/20 disabled:opacity-50 transition-colors flex justify-center items-center gap-2 uppercase tracking-wide cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <Eye className="w-5 h-5" /> {activeQuestion ? "Reveal Answer on Screen" : "Push a Question First"}
                                </button>
                                <button
                                    onClick={() => socket.emit('admin:round3:hide_question')}
                                    className="mt-3 w-full bg-red-500/10 text-red-400 font-bold py-2 rounded-xl border border-red-500/30 hover:bg-red-500/20 transition-colors text-sm uppercase tracking-wider flex justify-center items-center cursor-pointer"
                                >
                                    Clear Screen
                                </button>

                                {/* FONT SIZE CONTROLS */}
                                <div className="mt-4 flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-2 px-4 shadow-inner">
                                    <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Font Size</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => socket.emit('admin:round3:set_font_size', -4)} className="bg-white/10 hover:bg-white/20 text-white rounded p-1"><Minus size={16} /></button>
                                        <span className="text-sm font-mono text-[var(--color-neon-cyan)] font-bold w-8 text-center">{clientFontSize}</span>
                                        <button onClick={() => socket.emit('admin:round3:set_font_size', 4)} className="bg-white/10 hover:bg-white/20 text-white rounded p-1"><Plus size={16} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                                {questions.length === 0 ? (
                                    <div className="p-8 text-center border-2 border-dashed border-gray-700 rounded-xl text-gray-500 h-full flex items-center justify-center">
                                        No questions found for Sub-Round {selectedSubRound}.
                                    </div>
                                ) : (
                                    questions.map((q) => {
                                        const isActive = activeQuestion?.id === q.id;
                                        return (
                                            <div key={q.id} className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${isActive ? 'bg-[var(--color-neon-cyan)]/20 border-[var(--color-neon-cyan)] shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                                                <div className="text-white/80 line-clamp-3 text-sm leading-relaxed">
                                                    <Latex>{q.content?.mathText || q.content?.text}</Latex>
                                                </div>
                                                <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-3">
                                                    <span className="text-xs font-mono font-bold text-[var(--color-neon-cyan)]">Q.{q.id} ({q.marks} pts)</span>
                                                    <button
                                                        onClick={() => socket.emit('admin:round3:push_question', { id: q.id, subRoundNum: selectedSubRound })}
                                                        disabled={isActive}
                                                        className={`py-1.5 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${isActive ? 'bg-[var(--color-neon-cyan)] text-black border-[var(--color-neon-cyan)] cursor-not-allowed shadow-[0_0_10px_rgba(0,255,255,0.5)]' : 'bg-white/5 text-white/70 hover:bg-white/20 hover:text-white border-white/10 cursor-pointer flex items-center gap-2'}`}
                                                    >
                                                        {isActive ? 'Active on Screen' : <><Send size={12} /> Send to Screen</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Right Col: Teams & Hardware Queue Scoring */}
                <div className="col-span-12 lg:col-span-4 bg-white/5 p-8 rounded-2xl border border-white/10 flex flex-col h-full relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-[var(--color-neon-pink)]/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 relative z-10">
                        <h2 className="text-white/50 tracking-widest uppercase text-sm font-semibold flex items-center gap-2">
                            <Trophy className="w-4 h-4" /> Team Scoring
                        </h2>
                    </div>

                    <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                        {teams.map(team => {
                            // Find their position in the hard-ware queue if they pressed
                            const buzzIndex = buzzerQueue.findIndex(b => b.teamId === team.id);
                            const hasBuzzed = buzzIndex !== -1;
                            const isActiveTurn = hasBuzzed && buzzIndex === passCount;
                            const isPassed = hasBuzzed && buzzIndex < passCount;

                            let styles = 'bg-black/40 border-white/5 hover:border-white/20';
                            if (isActiveTurn) {
                                styles = 'bg-[var(--color-neon-pink)]/10 border-[var(--color-neon-pink)] shadow-[0_0_20px_rgba(255,0,255,0.2)]';
                            } else if (hasBuzzed && !isPassed) {
                                styles = 'bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)] ring-1 ring-green-500/50';
                            } else if (isPassed) {
                                styles = 'bg-red-500/10 border-red-500/30 opacity-60';
                            } else if (allocatedTeamId === team.id) {
                                styles = 'bg-[var(--color-neon-cyan)]/10 border-[var(--color-neon-cyan)] shadow-[0_0_15px_rgba(0,255,255,0.2)]';
                            }

                            return (
                                <div
                                    key={team.id}
                                    className={`p-5 rounded-xl border-2 transition-all flex flex-col gap-4 ${styles}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-xl font-bold text-white flex items-center gap-2">
                                                {team.id}. {team.name}
                                                {hasBuzzed && (
                                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${isPassed ? 'bg-red-500 text-white' : 'bg-[var(--color-neon-pink)] text-white'}`}>
                                                        #{buzzIndex + 1}
                                                    </span>
                                                )}
                                            </span>
                                            {isActiveTurn && <span className="text-xs text-[var(--color-neon-pink)] font-bold tracking-widest uppercase mt-1 animate-pulse">Hardware Priority Turn</span>}
                                            {isPassed && <span className="text-xs text-red-500 font-bold tracking-widest uppercase mt-1 line-through">Passed Over</span>}
                                        </div>
                                        <div className="bg-black/50 border border-white/10 w-16 h-16 rounded-xl flex items-center justify-center shrink-0">
                                            <span className="text-2xl font-black text-[var(--color-neon-cyan)] text-glow-cyan">{team.score}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
                                        <div className="flex flex-1 flex-col gap-2">
                                            {isActiveTurn && (
                                                <button onClick={() => socket.emit('admin:round3:pass_next')} className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded border bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500 hover:text-white transition-colors cursor-pointer w-full text-center mr-4">
                                                    Pass to Next Buzzer
                                                </button>
                                            )}
                                            {/* ALLOCATE TEAM BUTTON */}
                                            <button
                                                onClick={() => socket.emit('admin:round3:allocate_team', team.id)}
                                                className={`px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded border transition-colors cursor-pointer w-full text-center mr-4 ${allocatedTeamId === team.id ? 'bg-[var(--color-neon-cyan)] text-black border-[var(--color-neon-cyan)]' : 'bg-transparent text-white/50 border-white/20 hover:text-white hover:border-white/50'}`}
                                            >
                                                {allocatedTeamId === team.id ? 'Un-Allocate' : 'Allocate Turn'}
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => socket.emit('admin:round3:award_points', { teamId: team.id, points: -5 })} className="bg-red-500/20 text-red-500 p-1.5 rounded-lg hover:bg-red-500/40 cursor-pointer border border-red-500/30"><Minus className="w-4 h-4" /></button>
                                            <button onClick={() => socket.emit('admin:round3:award_points', { teamId: team.id, points: 10 })} className="bg-green-500/20 text-green-400 p-1.5 rounded-lg hover:bg-green-500/40 cursor-pointer border border-green-500/30"><Plus className="w-4 h-4" /></button>
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
