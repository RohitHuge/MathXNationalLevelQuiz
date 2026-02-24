import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// Generate 50 basic math questions for demo purposes
const DEMO_QUESTIONS = Array.from({ length: 50 }, (_, i) => {
    // We'll rotate between different types of basic questions so it's not totally repetitive
    const type = i % 5;
    let questionText, options, correctOptionIndex;

    if (type === 0) {
        questionText = `Solve the algebraic expression: $$${i + 2}x + ${i + 5} = ${i * 3 + 10}$$`;
        options = [`$$x = \\frac{${i * 3 + 5}}{${i + 2}}$$`, `$$x = ${i + 1}$$`, `$$x = 0$$`, `$$x = -${i}$$`];
        correctOptionIndex = 0;
    } else if (type === 1) {
        questionText = `Evaluate the definite integral: $$\\int_{0}^{\\pi/2} \\sin^2(x) \\, dx$$`;
        options = ['$$\\pi$$', '$$\\pi/2$$', '$$\\pi/4$$', '$$1$$'];
        correctOptionIndex = 2;
    } else if (type === 2) {
        questionText = `Find the eigenvalues of the matrix $$A = \\begin{pmatrix} ${i} & 1 \\\\ 1 & ${i} \\end{pmatrix}$$`;
        options = [`$$${i - 1} \\text{ and } ${i + 1}$$`, `$$${i} \\text{ and } ${i}$$`, `$$0 \\text{ and } ${i}$$`, `$$1 \\text{ and } -1$$`];
        correctOptionIndex = 0;
    } else if (type === 3) {
        questionText = `If $$f(x) = e^{${i}x} \\cos(x)$$, what is $$f'(0)$$?`;
        options = [`$$${i}$$`, `$$${i + 1}$$`, `$$0$$`, `$$1$$`];
        correctOptionIndex = 0;
    } else {
        questionText = `What is the sum of the first ${i + 10} positive integers?`;
        const sum = ((i + 10) * (i + 11)) / 2;
        options = [`$$${sum}$$`, `$$${sum - 5}$$`, `$$${sum + 10}$$`, `$$${sum * 2}$$`];
        correctOptionIndex = 0;
    }

    return {
        $id: `q${i + 1}`,
        questionText,
        options,
        correctOptionIndex,
        points: 4 // 50 questions * 4 = 200 PTS max
    };
});

export default function QuizArena({ user }) {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState({}); // Stores boolean flag per index
    const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 mins default
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Effect to toggle the body class for global background styling
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    }, [isDarkMode]);

    useEffect(() => {
        setTimeout(() => setLoading(false), 2000);
    }, []);

    useEffect(() => {
        if (loading || submitted || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, submitted, timeLeft]);

    const handleSelect = (optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: optionIndex
        }));
    };

    const toggleReview = () => {
        setMarkedForReview(prev => ({
            ...prev,
            [currentIndex]: !prev[currentIndex]
        }));
    };

    const calculateScore = () => {
        let totalScore = 0;
        DEMO_QUESTIONS.forEach((q, idx) => {
            if (answers[idx] === q.correctOptionIndex) {
                totalScore += q.points || 10;
            }
        });
        return totalScore;
    };

    const handleSubmit = async () => {
        if (!window.confirm("Are you sure you want to finish the exam?\nAny unattempted questions will score 0.")) {
            return;
        }
        setSubmitted(true);
        setScore(calculateScore());
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
                        <div className="text-sm text-slate-400 font-medium mb-2 uppercase tracking-wider">Final Score</div>
                        <div className="text-6xl font-black text-white tracking-tight">
                            {score} <span className="text-xl font-bold text-slate-500">PTS</span>
                        </div>
                    </div>

                    <div>
                        <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = DEMO_QUESTIONS[currentIndex];

    return (
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
                            Question <span className="font-bold ml-1">{currentIndex + 1}</span> of {DEMO_QUESTIONS.length}
                        </div>

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

                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar flex flex-col">
                        <h3 className={`text-xl md:text-2xl font-semibold mb-8 leading-relaxed shrink-0 ${isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                            <Latex>{currentQ?.questionText}</Latex>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pb-4 shrink-0">
                            {currentQ?.options?.map((opt, i) => {
                                const isSelected = answers[currentIndex] === i;

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
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className={`px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${isDarkMode
                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                            }`}
                    >
                        Previous Question
                    </button>

                    <button
                        onClick={() => setCurrentIndex(prev => Math.min(DEMO_QUESTIONS.length - 1, prev + 1))}
                        disabled={currentIndex === DEMO_QUESTIONS.length - 1}
                        className={`px-8 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border ${currentIndex === DEMO_QUESTIONS.length - 1
                            ? (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-400 border-gray-200')
                            : (isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-600' : 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700 shadow-sm')
                            }`}
                    >
                        Next Question
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
                        {DEMO_QUESTIONS.map((_, idx) => {
                            const isCurrent = currentIndex === idx;
                            const isAnswered = answers[idx] !== undefined;
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
                            onClick={handleSubmit}
                            className={`w-full py-3.5 rounded-lg text-sm font-bold tracking-wider transition-all shadow-md hover:shadow-lg ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                        >
                            SUBMIT EXAM
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
