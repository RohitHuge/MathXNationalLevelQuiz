import React, { useState, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { Play, Pause, Trophy, Settings2, Eye, EyeOff, Plus, Minus, List, Clock, Zap, Lock, Unlock, Send } from 'lucide-react';
import Latex from 'react-latex-next';

export default function Round3Admin() {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedSubRound, setSelectedSubRound] = useState(1);
  const [customTimer, setCustomTimer] = useState('');
  const [showTeamEdit, setShowTeamEdit] = useState(false);
  const [tempTeamNames, setTempTeamNames] = useState({});
  const [rfSets, setRfSets] = useState([]);
  const [rfSelectedSet, setRfSelectedSet] = useState(null);
  const [rfSelectedTeamId, setRfSelectedTeamId] = useState(null);

  useEffect(() => {
    if (!socket) return undefined;

    socket.on('server:round3:state_update', setGameState);
    socket.on('server:round3:questions_list', setQuestions);
    socket.on('server:round3:timer_tick', (t) => setGameState((prev) => (prev ? { ...prev, timerTime: t } : prev)));
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

  const {
    activeQuestion,
    judgedOption,
    timerTime,
    isTimerRunning,
    buzzerLocked,
    buzzerQueue,
    passCount,
    teams,
    clientFontSize,
    allocatedTeamId,
    showTimer,
  } = gameState;

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
    gameState.teams.forEach((t) => {
      names[t.id] = t.name;
    });
    setTempTeamNames(names);
    setShowTeamEdit(true);
  };

  const rapidFire = gameState.rapidFire;
  const progressMax = Math.max(rapidFire?.questions?.length || 0, 1);
  const progressWidth = rapidFire ? (rapidFire.questionIndex / progressMax) * 100 : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden font-sans">
      <header className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_4px_30px_rgba(0,0,0,0.1)] md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 bg-gradient-to-r from-[var(--color-neon-pink)] to-[var(--color-neon-blue)] bg-clip-text text-2xl font-black uppercase tracking-wide text-transparent">
            <Settings2 className="text-[var(--color-neon-pink)]" size={20} />
            Round 3 Stage Manager
          </h1>
          <p className="mb-2 mt-1 text-xs text-[var(--color-gray-400)]">Administer the five buzzer sub-rounds.</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => handleSubRoundChange(r)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${selectedSubRound === r ? 'bg-[var(--color-neon-cyan)] text-black shadow-[0_0_10px_rgba(0,255,255,0.5)]' : 'border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`}
              >
                SR {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <button onClick={() => handleStageChange(1)} className="flex-1 rounded-xl border border-[var(--color-neon-cyan)]/30 bg-black/40 px-4 py-2 text-sm font-bold text-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/20 md:flex-none">
            Force Waiting Room
          </button>
          <button onClick={() => handleStageChange(2)} className="flex-1 rounded-xl bg-[var(--color-neon-blue)] px-5 py-2 text-sm font-bold text-white shadow-[0_0_15px_rgba(0,136,255,0.4)] hover:bg-[var(--color-neon-blue)]/80 md:flex-none">
            Launch Projector
          </button>
          <button onClick={initTeamEdit} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">
            <Settings2 size={16} />
            Team Names
          </button>
        </div>
      </header>

      {showTeamEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#1a1a2e] p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-3 text-xl font-black uppercase tracking-widest text-white">
                <Trophy className="text-[var(--color-neon-cyan)]" />
                Register Team Names
              </h2>
              <button onClick={() => setShowTeamEdit(false)} className="text-white/50 hover:text-white">&times;</button>
            </div>
            <div className="mb-5 grid grid-cols-1 gap-3">
              {[1, 2, 3, 4, 5, 6].map((id) => (
                <div key={id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="w-6 font-mono font-bold text-[var(--color-neon-cyan)]">{id}.</span>
                  <input
                    type="text"
                    value={tempTeamNames[id] || ''}
                    onChange={(e) => setTempTeamNames((prev) => ({ ...prev, [id]: e.target.value }))}
                    placeholder={`Team ${id} Name`}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-neon-cyan)]"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowTeamEdit(false)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white">
                Cancel
              </button>
              <button onClick={handleApplyTeamNames} className="flex-[2] rounded-xl bg-[var(--color-neon-cyan)] py-2.5 text-sm font-black uppercase tracking-wider text-black hover:bg-[var(--color-neon-cyan)]/80">
                Apply Names
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
        <div className="col-span-12 flex h-full min-h-[18rem] flex-col gap-3 lg:col-span-4 lg:min-h-0">
          <div className="relative flex flex-shrink-0 flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[var(--color-neon-cyan)]/10 blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <h2 className="relative z-10 mb-4 flex w-full items-center justify-between px-2 text-xs font-semibold uppercase tracking-widest text-white/50">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Master Timer
              </div>
              <button
                onClick={() => socket.emit('admin:round3:toggle_timer_visibility')}
                title={showTimer !== false ? 'Hide Timer on Screen' : 'Show Timer on Screen'}
                className={`rounded-lg border p-1.5 ${showTimer !== false ? 'border-[var(--color-neon-cyan)]/50 bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)]' : 'border-red-500/50 bg-red-500/20 text-red-400'}`}
              >
                {showTimer !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </h2>
            <div className={`relative z-10 mb-5 text-5xl font-black font-mono ${timerTime <= 10 ? 'text-[var(--color-neon-pink)] drop-shadow-[0_0_15px_rgba(255,0,255,0.8)]' : 'text-[var(--color-neon-cyan)] drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]'}`}>
              {timerTime}
            </div>
            <div className="relative z-10 mb-4 flex gap-2">
              <button onClick={() => socket.emit('admin:round3:start_timer')} disabled={isTimerRunning} className="rounded-xl border border-green-500/50 bg-green-500/20 p-2.5 text-green-400 hover:bg-green-500/30 disabled:opacity-50">
                <Play className="h-4 w-4" />
              </button>
              <button onClick={() => socket.emit('admin:round3:pause_timer')} disabled={!isTimerRunning} className="rounded-xl border border-amber-500/50 bg-amber-500/20 p-2.5 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50">
                <Pause className="h-4 w-4" />
              </button>
            </div>
            <div className="relative z-10 flex w-full gap-2">
              <input
                type="number"
                value={customTimer}
                onChange={(e) => setCustomTimer(e.target.value)}
                placeholder="Secs"
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white hover:border-white/50 focus:outline-none focus:border-[var(--color-neon-cyan)]"
              />
              <button onClick={handleSetTimer} className="rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20">
                Set
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[var(--color-neon-purple)]/10 blur-3xl translate-y-1/2 -translate-x-1/4"></div>
            <h2 className="relative z-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/50">
              <Zap className="h-4 w-4" />
              Hardware State
            </h2>
            <div className="relative z-10 flex h-full flex-col justify-center">
              {buzzerLocked ? (
                <button onClick={() => socket.emit('admin:round3:unlock_buzzers')} className="flex w-full flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-green-500/50 bg-green-500/10 p-4 text-base font-black text-green-500 hover:bg-green-500/20">
                  <Unlock size={24} />
                  ARM BUZZERS NOW
                </button>
              ) : (
                <button onClick={() => socket.emit('admin:round3:lock_buzzers')} className="flex w-full flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-red-500/20 p-4 text-base font-black text-red-500 hover:bg-red-500 hover:text-white animate-pulse">
                  <Lock size={24} />
                  BUZZERS LIVE - LOCK GLOBALLY
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 flex h-full min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-4 lg:min-h-0">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          {selectedSubRound === 5 ? (
            <div className="custom-scrollbar relative z-10 flex h-full flex-col gap-3 overflow-y-auto pr-1">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/50">
                <Zap className="h-4 w-4 text-yellow-400" />
                Rapid Fire Control
              </h2>

              {!rapidFire?.active ? (
                <>
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Select Set</p>
                    <div className="grid grid-cols-3 gap-2">
                      {rfSets.length === 0 ? (
                        <div className="col-span-3 rounded-xl border border-dashed border-white/10 py-4 text-center text-sm text-white/30">
                          No SR5 questions found in DB
                        </div>
                      ) : (
                        rfSets.map((s) => (
                          <button
                            key={s.setNumber}
                            onClick={() => setRfSelectedSet(s)}
                            className={`rounded-xl border py-2.5 text-sm font-bold ${rfSelectedSet?.setNumber === s.setNumber ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'border-white/10 bg-black/40 text-white/70 hover:border-white/30'}`}
                          >
                            Set {s.setNumber}
                            <br />
                            <span className="text-[10px] font-normal text-white/40">{s.count} Qs</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Allocate Team</p>
                    <div className="grid grid-cols-2 gap-2">
                      {teams?.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => setRfSelectedTeamId(team.id)}
                          className={`rounded-xl border py-2 text-xs font-bold ${rfSelectedTeamId === team.id ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)]' : 'border-white/10 bg-black/30 text-white/60 hover:border-white/30'}`}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={!rfSelectedSet || !rfSelectedTeamId}
                    onClick={() => {
                      socket.emit('admin:round3:rf_start', {
                        setNumber: rfSelectedSet.setNumber,
                        teamId: rfSelectedTeamId,
                        questions: rfSelectedSet.questions,
                      });
                    }}
                    className="mt-2 w-full rounded-xl bg-yellow-500 py-3 text-sm font-black uppercase tracking-wider text-black hover:bg-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Start Rapid Fire
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
                      <span>Question {Math.min(rapidFire.questionIndex + 1, rapidFire.questions.length)} of {rapidFire.questions.length}</span>
                      <span>Set {rapidFire.setNumber} | {teams?.find((t) => t.id === rapidFire.teamId)?.name}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-yellow-400 transition-all duration-300" style={{ width: `${progressWidth}%` }} />
                    </div>
                  </div>

                  {rapidFire.questionIndex < rapidFire.questions.length ? (
                    <>
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm leading-relaxed text-white/80">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-yellow-400">Q{rapidFire.questionIndex + 1}</div>
                        <Latex>{rapidFire.questions[rapidFire.questionIndex]?.content?.mathText || rapidFire.questions[rapidFire.questionIndex]?.content?.text || ''}</Latex>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {(rapidFire.questions[rapidFire.questionIndex]?.content?.options || []).map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => socket.emit('admin:round3:rf_answer', { selectedOption: idx })}
                            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-xs font-bold text-white hover:border-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/20"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--color-neon-cyan)]/20 text-[10px] font-black text-[var(--color-neon-cyan)]">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="line-clamp-2 text-left"><Latex>{opt}</Latex></span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center font-bold text-green-400">All questions answered.</div>
                  )}

                  <div className="mt-auto flex gap-2 pt-2">
                    <button onClick={() => socket.emit('admin:round3:rf_calculate')} className="flex-1 rounded-xl bg-green-500 py-3 text-sm font-black uppercase tracking-wider text-black hover:bg-green-400">
                      Calculate Results
                    </button>
                    <button onClick={() => socket.emit('admin:round3:rf_reset')} className="rounded-xl border border-red-500/30 bg-red-500/20 px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/30">
                      Reset
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="relative z-10 mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/50">
                  <List className="h-4 w-4" />
                  Question Library
                </h2>
                {activeQuestion && selectedSubRound === 3 && (
                  <div className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${allocatedTeamId ? 'border-orange-500/50 bg-orange-500/20 text-orange-400' : 'border-red-500/50 bg-red-500/20 text-red-400'}`}>
                    {allocatedTeamId ? `Base T${allocatedTeamId}` : 'No Team Allocated'}
                  </div>
                )}
              </div>

              <div className="relative z-10 mb-3 flex-shrink-0">
                <button
                  onClick={() => socket.emit('admin:round3:reveal_answer')}
                  disabled={!activeQuestion}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  {activeQuestion ? 'Reveal Answer on Screen' : 'Push a Question First'}
                </button>
                <button onClick={() => socket.emit('admin:round3:hide_question')} className="mt-2 flex w-full items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20">
                  Clear Screen
                </button>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-2 px-3 shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Font Size</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => socket.emit('admin:round3:set_font_size', -4)} className="rounded bg-white/10 p-1 text-white hover:bg-white/20">
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-mono text-sm font-bold text-[var(--color-neon-cyan)]">{clientFontSize}</span>
                    <button onClick={() => socket.emit('admin:round3:set_font_size', 4)} className="rounded bg-white/10 p-1 text-white hover:bg-white/20">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {activeQuestion?.options?.length > 0 && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Team Answer Marker</span>
                      <button
                        onClick={() => socket.emit('admin:round3:clear_judged_option')}
                        disabled={!judgedOption}
                        className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:bg-white/10 disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {activeQuestion.options.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isSelected = judgedOption?.selectedIndex === idx;
                        const stateClass = isSelected
                          ? judgedOption.isCorrect
                            ? 'border-green-500/60 bg-green-500/20 text-green-300'
                            : 'border-red-500/60 bg-red-500/20 text-red-300'
                          : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30';

                        return (
                          <button
                            key={idx}
                            onClick={() => socket.emit('admin:round3:judge_option', { selectedIndex: idx })}
                            className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${stateClass}`}
                          >
                            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-black/30 text-[10px] font-black">
                              {letter}
                            </span>
                            <span>{isSelected ? (judgedOption.isCorrect ? 'Marked Correct' : 'Marked Wrong') : 'Mark This Option'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="custom-scrollbar relative z-10 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {questions.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-gray-700 p-8 text-center text-sm text-gray-500">
                    No questions found for Sub-Round {selectedSubRound}.
                  </div>
                ) : (
                  questions.map((q) => {
                    const isActive = activeQuestion?.id === q.id;
                    return (
                      <div key={q.id} className={`flex flex-col gap-2 rounded-xl border p-3 ${isActive ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]/20 shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'border-white/5 bg-black/40 hover:border-white/20'}`}>
                        <div className="line-clamp-3 text-sm leading-relaxed text-white/80">
                          <Latex>{q.content?.mathText || q.content?.text}</Latex>
                        </div>
                        <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="text-[10px] font-mono font-bold text-[var(--color-neon-cyan)]">Q.{q.id} ({q.marks} pts)</span>
                          <button
                            onClick={() => socket.emit('admin:round3:push_question', { id: q.id, subRoundNum: selectedSubRound })}
                            disabled={isActive}
                            className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isActive ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)] text-black cursor-not-allowed' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/20 hover:text-white'}`}
                          >
                            {isActive ? 'Active' : (
                              <span className="flex items-center gap-2">
                                <Send size={12} />
                                Send
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        <div className="col-span-12 flex h-full min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-4 lg:min-h-0">
          <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-[var(--color-neon-pink)]/10 blur-3xl translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative z-10 mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/50">
              <Trophy className="h-4 w-4" />
              Team Scoring
            </h2>
          </div>

          <div className="custom-scrollbar relative z-10 flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {teams.map((team) => {
              const buzzIndex = buzzerQueue.findIndex((b) => b.teamId === team.id);
              const hasBuzzed = buzzIndex !== -1;
              const isActiveTurn = hasBuzzed && buzzIndex === passCount;
              const isPassed = hasBuzzed && buzzIndex < passCount;

              let styles = 'bg-black/40 border-white/5 hover:border-white/20';
              if (isActiveTurn) styles = 'bg-[var(--color-neon-pink)]/10 border-[var(--color-neon-pink)] shadow-[0_0_20px_rgba(255,0,255,0.2)]';
              else if (hasBuzzed && !isPassed) styles = 'bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)] ring-1 ring-green-500/50';
              else if (isPassed) styles = 'bg-red-500/10 border-red-500/30 opacity-60';
              else if (allocatedTeamId === team.id) styles = 'bg-[var(--color-neon-cyan)]/10 border-[var(--color-neon-cyan)] shadow-[0_0_15px_rgba(0,255,255,0.2)]';

              return (
                <div key={team.id} className={`flex flex-col gap-3 rounded-xl border-2 p-4 ${styles}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2 text-lg font-bold text-white">
                        {team.id}. {team.name}
                        {hasBuzzed && (
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${isPassed ? 'bg-red-500 text-white' : 'bg-[var(--color-neon-pink)] text-white'}`}>
                            #{buzzIndex + 1}
                          </span>
                        )}
                      </span>
                      {isActiveTurn && <span className="mt-1 text-xs font-bold uppercase tracking-widest text-[var(--color-neon-pink)] animate-pulse">Hardware Priority Turn</span>}
                      {isPassed && <span className="mt-1 text-xs font-bold uppercase tracking-widest text-red-500 line-through">Passed Over</span>}
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50">
                      <span className="text-xl font-black text-[var(--color-neon-cyan)]">{team.score}</span>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2">
                    <div className="mr-4 flex flex-1 flex-col gap-2">
                      {isActiveTurn && (
                        <button onClick={() => socket.emit('admin:round3:pass_next')} className="w-full rounded border border-red-500/50 bg-red-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-500 hover:text-white">
                          Pass to Next Buzzer
                        </button>
                      )}
                      <button
                        onClick={() => socket.emit('admin:round3:allocate_team', team.id)}
                        className={`w-full rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${allocatedTeamId === team.id ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)] text-black' : 'border-white/20 bg-transparent text-white/50 hover:text-white hover:border-white/50'}`}
                      >
                        {allocatedTeamId === team.id ? 'Un-Allocate' : 'Allocate Turn'}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => socket.emit('admin:round3:award_points', { teamId: team.id, points: -5 })} className="rounded-lg border border-red-500/30 bg-red-500/20 p-1.5 text-red-500 hover:bg-red-500/40">
                        <Minus className="h-4 w-4" />
                      </button>
                      <button onClick={() => socket.emit('admin:round3:award_points', { teamId: team.id, points: 10 })} className="rounded-lg border border-green-500/30 bg-green-500/20 p-1.5 text-green-400 hover:bg-green-500/40">
                        <Plus className="h-4 w-4" />
                      </button>
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
