import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

import { useSocket } from '../SocketContext';
import { useFullScreenEnforcement } from '../hooks/useFullScreenEnforcement';

export default function QuizArena({ user }) {
    const navigate = useNavigate();

    const { socket } = useSocket();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [localSelection, setLocalSelection] = useState(null); // stores what the user clicked before pressing save
    const [markedForReview, setMarkedForReview] = useState({}); // Stores boolean flag per index

    // Timer synchronization variables
    const [timeLeft, setTimeLeft] = useState(0);
    const [timerRef, setTimerRef] = useState(null);

    const [submitted, setSubmitted] = useState(false);
    const [attemptedCount, setAttemptedCount] = useState(0); // number of attempted questions if submitted early
    const [isDarkMode, setIsDarkMode] = useState(true);

    const {
        warnings,
        showWarningModal,
        reEnterFullScreen,
        remainingWarnings
    } = useFullScreenEnforcement(
        !loading && !submitted,
        () => handleSubmit(true),
        (violation) => {
            if (socket && user) {
                socket.emit('client:cheat_detected', {
                    teamName: user.team_name || user.name || 'Unknown',
                    type: violation.type,
                    warningCount: violation.currentWarning
                });
            }
        }
    );

    // We'll use the user's mapped email for PostgreSQL UUID lookup

    // Effect to toggle the body class for global background styling
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (!socket) return;

        // Listen for returned array
        socket.on('server:all_questions', (fetchedQuestions) => {
            setQuestions(fetchedQuestions);
            setLoading(false);
        });

        // Listen for absolute synchronized state (includes endTime and serverTime)
        socket.on('server:sync_state', (state) => {
            console.log('[Sync State Received]', state);
            if (state.stage === 0) {
                // Admin requested a global reset, force them back to dashboard
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.error(err));
                }
                navigate('/dashboard');
            } else if (state.stage === 1) {
                // Admin shifted them back to the waiting room intentionally
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.error(err));
                }
                navigate('/waiting');
            } else if (state.stage === 2 && state.timerEnd && state.serverTime) {
                // Determine absolute end time
                const timerEndMs = new Date(state.timerEnd).getTime();

                // Calculate difference between Server's UTC time and Client's local time
                const serverTimeMs = new Date(state.serverTime).getTime();
                const clientTimeMs = Date.now();
                const clockOffset = serverTimeMs - clientTimeMs;

                // Store references safely for interval
                setTimerRef({
                    endMs: timerEndMs,
                    offset: clockOffset
                });

                // Set initial immediate time left to avoid 0s flash
                const now = Date.now() + clockOffset;
                const remaining = Math.max(0, Math.floor((timerEndMs - now) / 1000));

                // Provide a functional update to force React to log it securely globally
                setTimeLeft(() => remaining);
            }
        });

        // Initial Fetch
        socket.emit('client:fetch_all_questions');
        // Explicitly request time state so the timer renders
        socket.emit('client:request_state');

        if (user?.email) {
            socket.emit('client:start_quiz', { email: user.email });
            socket.emit('client:load_answers', { email: user.email });
        }

        socket.on('server:answers_loaded', (loadedAnswers) => {
            const validAnswers = {};
            for (const [qId, opt] of Object.entries(loadedAnswers)) {
                if (opt >= 0) validAnswers[qId] = opt;
            }
            setAnswers(validAnswers);

            // On a successful save & next, if the server replied with answers, we can advance
            // But we actually only want to advance explicitly if they clicked the button.
            // We'll handle navigation inside the Save & Next function, but here we can at least clear the local selection.
            setLocalSelection(null);
        });

        socket.on('server:session_status', ({ status, attemptedCount }) => {
            if (status === 'submitted') {
                setAttemptedCount(attemptedCount || 0);
                setSubmitted(true);
            }
        });

        socket.on('server:answer_saved', () => {
            // Once the server confirms the single answer was saved, fetch the full truth again
            if (user?.email) {
                socket.emit('client:load_answers', { email: user.email });
            }
        });

        return () => {
            socket.off('server:all_questions');
            socket.off('server:sync_state');
            socket.off('server:answers_loaded');
            socket.off('server:session_status');
            socket.off('server:answer_saved');
        };
    }, [socket, user]);

    useEffect(() => {
        if (loading || submitted || !timerRef) return;

        const calculateTimeLeft = () => {
            const now = Date.now() + timerRef.offset;
            const remaining = Math.max(0, Math.floor((timerRef.endMs - now) / 1000));

            // Only update state if value actually changed to prevent re-renders
            setTimeLeft(prev => {
                if (prev === remaining) return prev;
                return remaining;
            });

            if (remaining <= 0) {
                handleSubmit(true);
                return true; // Indicates we hit zero
            }
            return false;
        };

        // Run immediately to establish correct time on mount or ref change
        if (calculateTimeLeft()) return;

        const timer = setInterval(() => {
            const hitZero = calculateTimeLeft();
            if (hitZero) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, submitted, timerRef]);

    // Only update local UI state immediately
    const handleSelect = (optionIndex) => {
        setLocalSelection(optionIndex);
    };

    // New Function: Actually save to DB and move forward
    const handleSaveAndNext = () => {
        const currentQ = questions[currentIndex];

        // If they chose something locally that isn't saved yet
        if (localSelection !== null && socket && user?.email) {
            socket.emit('client:save_answer', {
                email: user.email,
                questionId: currentQ.id,
                selectedOption: localSelection
            });
        }

        // Move to the next question visually immediately (the answers from DB will load slightly later)
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const toggleReview = () => {
        setMarkedForReview(prev => ({
            ...prev,
            [currentIndex]: !prev[currentIndex]
        }));
    };

    // When clear is pressed, emit immediately since it's an explicit action
    const handleClear = () => {
        setLocalSelection(null);
        if (socket && user?.email) {
            socket.emit('client:save_answer', {
                email: user.email,
                questionId: questions[currentIndex].id,
                selectedOption: -1 // Evaluates to incorrect on backend
            });
        }
    };

    const handleSubmit = async (forceSubmit = false) => {
        if (!forceSubmit && !window.confirm("Are you sure you want to finish the exam?\nUnattempted questions will not be scored.")) {
            return;
        }

        // Emit payload heavily mapped to postgres relationships
        if (socket && user?.email) {
            socket.emit('client:submit_exam', {
                email: user.email
            });
        }

        // Count how many they attempted locally before final submit
        const localAttempted = Object.keys(answers).length;
        setAttemptedCount(localAttempted);

        setSubmitted(true);
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.error(err));
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6"></div>
            <div className="text-xl font-semibold text-slate-400 tracking-wide">
                Loading Quiz Data...
            </div>
        </div>
    );

    if (submitted) {
        return (
            <div className="max-w-xl mx-auto mt-20 px-4">
                <div className="bg-slate-900 border border-slate-800 text-center py-16 px-8 rounded-2xl shadow-xl">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-white">Quiz Completed</h2>
                    <p className="text-slate-400 mb-10">Your results have been successfully recorded.</p>

                    <div className="bg-slate-800/50 rounded-2xl p-8 mb-10 border border-slate-700/50 inline-block">
                        <div className="text-3xl font-bold text-white mb-2">{attemptedCount}</div>
                        <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Questions Attempted</div>
                        <div className="border-t border-slate-700 my-4"></div>
                        <div className="text-xl text-slate-400 font-medium mb-2 uppercase tracking-wider mt-4">Please observe the Admin Leaderboard for grading.</div>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    if (!currentQ && !loading) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-white">
            <h2 className="text-2xl font-bold">No active questions available.</h2>
        </div>
    );

    return (
        <>
            {showWarningModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-red-500 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Warning!</h3>
                        <p className="text-gray-600 dark:text-slate-300 mb-6">
                            You have exited full-screen mode. This is a violation of the test rules.
                            <br /><br />
                            <span className="font-semibold text-red-600 dark:text-red-400">
                                Remaining Warnings: {remainingWarnings}
                            </span>
                            <br />
                            <span className="text-sm">The test will auto-submit if warnings are depleted.</span>
                        </p>
                        <button
                            onClick={reEnterFullScreen}
                            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
                        >
                            I Understand - Return to Exam
                        </button>
                    </div>
                </div>
            )}
            <div className={`w-full max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 p-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {/* LEFT AREA: Quiz Content Container */}
                <div className="flex-1 flex flex-col h-full min-w-0 pb-4 relative">

                    {/* Theme Toggle Button positioned cleanly at the top */}
                    <div className="absolute top-2 right-4 z-10 flex gap-2">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-full border transition-all shadow-sm flex items-center justify-center ${isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700'
                                : 'bg-white border-gray-200 text-slate-800 hover:bg-gray-50'
                                }`}
                            title="Toggle Theme"
                        >
                            {isDarkMode ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Question Panel */}
                    <div className={`flex-1 flex flex-col rounded-t-xl overflow-hidden min-h-0 border relative pt-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'
                        }`}>
                        <div className={`w-full p-6 flex justify-between items-center border-b shrink-0 pr-16 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className={`px-3 py-1 rounded font-semibold text-sm ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}>
                                Question <span className="font-bold ml-1">{currentIndex + 1}</span> of {questions.length}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleClear}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition-colors border ${isDarkMode
                                        ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                                        : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Clear Option
                                </button>
                                <button
                                    onClick={toggleReview}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition-colors border ${markedForReview[currentIndex]
                                        ? isDarkMode
                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                            : 'bg-purple-100 text-purple-700 border-purple-300'
                                        : isDarkMode
                                            ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {markedForReview[currentIndex] ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                        )}
                                    </svg>
                                    {markedForReview[currentIndex] ? 'Marked' : 'Mark for Review'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar flex flex-col">
                            <h3 className={`text-xl md:text-2xl font-semibold mb-8 leading-relaxed shrink-0 flex flex-col gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                <span><Latex>{currentQ?.content?.text || ''}</Latex></span>
                                {currentQ?.content?.mathText && (
                                    <Latex>{currentQ.content.mathText}</Latex>
                                )}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pb-4 shrink-0">
                                {currentQ?.content?.options?.map((opt, i) => {
                                    // It is selected if it is locally clicked OR if it's the truth from DB and we haven't clicked anything else
                                    const isSelectedReal = answers[currentQ.id] === i;
                                    const isSelectedLocal = localSelection === i;

                                    const isSelected = isSelectedLocal || (localSelection === null && isSelectedReal);

                                    let buttonClass = 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900';
                                    let iconClass = 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-700';

                                    if (isDarkMode) {
                                        buttonClass = 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 hover:text-white';
                                        iconClass = 'bg-slate-700 text-slate-400 group-hover:bg-slate-600 group-hover:text-white';
                                    }

                                    if (isSelected) {
                                        buttonClass = isDarkMode
                                            ? 'bg-blue-600/10 border-blue-500 text-white'
                                            : 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm';
                                        iconClass = 'bg-blue-500 text-white';
                                    }

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(i)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center gap-4 group shrink-0 ${buttonClass}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${iconClass}`}>
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                            <span className="text-lg font-medium overflow-x-auto custom-scrollbar">
                                                <Latex>{opt}</Latex>
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Nav */}
                    <div className={`shrink-0 flex justify-between items-center p-4 rounded-b-xl border flex-wrap gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800 border-t-slate-800/50' : 'bg-gray-50 border-gray-200 border-t-transparent'
                        }`}>
                        <button
                            onClick={() => {
                                setLocalSelection(null);
                                setCurrentIndex(prev => Math.max(0, prev - 1));
                            }}
                            disabled={currentIndex === 0}
                            className={`px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${isDarkMode
                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                                }`}
                        >
                            Previous Question
                        </button>

                        <button
                            onClick={handleSaveAndNext}
                            disabled={currentIndex === questions.length - 1}
                            className={`px-8 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${currentIndex === questions.length - 1
                                ? (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-400 border-gray-200')
                                : (isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-600' : 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700 shadow-sm')
                                }`}
                        >
                            Save & Next
                        </button>
                    </div>
                </div>

                {/* RIGHT AREA: Timer & Overview Sidebar (Desktop) */}
                <div className="w-full md:w-[280px] shrink-0 flex flex-col gap-4 h-full pb-4 relative">

                    {/* Timer Panel */}
                    <div className={`border rounded-xl text-center py-6 shrink-0 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
                        }`}>
                        <div className={`uppercase tracking-wider text-xs font-semibold mb-2 flex items-center justify-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'
                            }`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Time Remaining
                        </div>
                        <div className={`font-mono text-4xl font-bold tracking-tight ${timeLeft < 300 ? 'text-red-500' : (isDarkMode ? 'text-white' : 'text-gray-900')
                            }`}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    {/* Questions Overview Panel */}
                    <div className={`border rounded-xl flex-1 flex flex-col p-5 shadow-sm min-h-[400px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
                        }`}>
                        <h4 className={`shrink-0 font-semibold tracking-wider uppercase mb-4 flex items-center gap-3 border-b pb-3 text-sm ${isDarkMode ? 'text-white border-slate-800' : 'text-gray-800 border-gray-100'
                            }`}>
                            Overview
                        </h4>

                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-auto custom-scrollbar content-start pr-1 pb-2 flex-grow">
                            {questions.map((q, idx) => {
                                const isCurrent = currentIndex === idx;
                                const isAnsweredDB = answers[q.id] !== undefined;
                                const isAnsweredLocal = isCurrent && localSelection !== null;
                                const isAnswered = isAnsweredDB || isAnsweredLocal;
                                const isMarked = markedForReview[idx];

                                let styling = isDarkMode
                                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:border-gray-300';

                                if (isCurrent) {
                                    styling = isDarkMode
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm font-bold z-10'
                                        : 'bg-blue-500 text-white border-blue-600 shadow-sm font-bold z-10';
                                } else if (isMarked) {
                                    styling = isDarkMode
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                        : 'bg-purple-50 text-purple-700 border-purple-300';
                                } else if (isAnswered) {
                                    // Updated to distinctly show Green when answered
                                    styling = isDarkMode
                                        ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                        : 'bg-green-50 text-green-700 border-green-300 font-semibold';
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm transition-colors border ${styling}`}
                                    >
                                        {idx + 1}
                                        {isMarked && !isCurrent && (
                                            <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-purple-400' : 'bg-purple-600'}`}></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className={`shrink-0 mt-4 border-t pt-3 grid grid-cols-2 gap-y-2 gap-x-2 text-xs font-medium mb-4 ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-gray-200 text-gray-500'
                            }`}>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-blue-500"></div> Current</div>
                            <div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded border ${isDarkMode ? 'bg-green-500/15 border-green-500/30' : 'bg-green-100 border-green-300'}`}></div> Answered</div>
                            <div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded border ${isDarkMode ? 'bg-purple-500/15 border-purple-500/30' : 'bg-purple-100 border-purple-300'}`}></div> Marked</div>
                            <div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}></div> Unvisited</div>
                        </div>

                        <div className="shrink-0">
                            <button
                                onClick={() => handleSubmit(false)}
                                className={`w-full py-3.5 rounded-lg text-sm font-bold tracking-wider transition-all shadow-md hover:shadow-lg ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                            >
                                SUBMIT EXAM
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}
