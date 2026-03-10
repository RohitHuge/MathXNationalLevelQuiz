import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Lock, Timer, Zap, Trophy, ZoomIn, ZoomOut } from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { useSocket, SocketProvider } from '../SocketContext';

import { useFullScreenEnforcement } from '../hooks/useFullScreenEnforcement';

const ClientViewInner = ({ user }) => {
    const { socket, isConnected } = useSocket();
    const [numericAnswer, setNumericAnswer] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState('0.00');
    const [fontScale, setFontScale] = useState(1);

    // New Round 2 States
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [winnerDetails, setWinnerDetails] = useState(null);
    const [liveAttempts, setLiveAttempts] = useState([]);

    // Anti-Cheat implementation
    const {
        warnings,
        showWarningModal,
        reEnterFullScreen,
        remainingWarnings
    } = useFullScreenEnforcement(
        !!activeQuestion && !winnerDetails && !isLocked,
        () => handleForceSubmit(),
        (violation) => {
            if (socket && isConnected && user) {
                socket.emit('client:cheat_detected', {
                    teamName: user.team_name || user.name || 'Unknown',
                    type: violation.type,
                    warningCount: violation.currentWarning
                });
            }
        }
    );

    const handleForceSubmit = () => {
        setIsLocked(true);
        setFeedbackMsg('Access Revoked: Anti-cheat violation limit reached.');
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.error(err));
        }
    };

    useEffect(() => {
        if (!socket) return;

        // Auto-fetch in case of reconnect
        socket.emit('client:round2:request_state');

        socket.on('question:active', (question) => {
            setActiveQuestion(question);
            setIsLocked(false);
            setNumericAnswer('');
            setStartTime(Date.now());
            setElapsed('0.00');
            setFeedbackMsg('');
            setWinnerDetails(null);
            setLiveAttempts([]);
        });

        // Hiding the question manually by Admin
        socket.on('server:round2:question_hidden', () => {
            setActiveQuestion(null);
            setIsLocked(false);
            setNumericAnswer('');
            setFeedbackMsg('');
            setWinnerDetails(null);
            setLiveAttempts([]);
        });

        // Handlers for Submitted Answer Lifecycle
        socket.on('server:round2:attempt_rejected', (data) => {
            setIsLocked(false); // UNLOCK so they can retry!
            setNumericAnswer('');
            setFeedbackMsg(data.message);
        });

        // Everyone sees somebody attempted an answer
        socket.on('server:round2:attempt_logged', (data) => {
            setLiveAttempts(prev => [data.attempt, ...prev].slice(0, 5)); // Keep last 5
        });

        // Someone won the round globally
        socket.on('server:round2:winner_found', (data) => {
            setIsLocked(true);
            setWinnerDetails(data);
        });

        // General Error (e.g., late attempt)
        socket.on('server:round2:error', (data) => {
            setFeedbackMsg(data.message);
            setIsLocked(true); // Usually locked if late
        });

        return () => {
            socket.off('question:active');
            socket.off('server:round2:question_hidden');
            socket.off('server:round2:attempt_rejected');
            socket.off('server:round2:attempt_logged');
            socket.off('server:round2:winner_found');
            socket.off('server:round2:error');
        };
    }, [socket]);

    useEffect(() => {
        let interval;
        if (activeQuestion && !isLocked && startTime && !winnerDetails) {
            interval = setInterval(() => {
                setElapsed(((Date.now() - startTime) / 1000).toFixed(2));
            }, 50);
        }
        return () => clearInterval(interval);
    }, [activeQuestion, isLocked, startTime, winnerDetails]);

    const handleLock = () => {
        if (numericAnswer.trim() !== '' && activeQuestion && !isLocked) {
            setIsLocked(true);
            setFeedbackMsg('');
            socket.emit('client:submit_answer', {
                questionId: activeQuestion.id,
                numericAnswer: parseFloat(numericAnswer),
                timeTaken: parseFloat(elapsed),
                clientName: user?.team_name || user?.name || `Team-${socket.id.substring(0, 4)}`
            });
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-purple relative overflow-hidden flex items-center justify-center p-4 sm:p-8 animate-in fly-in slide-in-from-bottom-5 duration-700">
            {/* Warning Modal */}
            {showWarningModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-brand-dark border border-red-500 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock className="text-red-500" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Anti-Cheat Alert!</h3>
                        <p className="text-gray-300 mb-6">
                            You have violated the test rules (escaped full-screen or switched tabs).
                            <br /><br />
                            <span className="font-semibold text-red-500">
                                Remaining Warnings: {remainingWarnings}
                            </span>
                            <br />
                            <span className="text-xs text-gray-400">The round will be locked for you if warnings are depleted.</span>
                        </p>
                        <button
                            onClick={reEnterFullScreen}
                            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
                        >
                            Return to Round
                        </button>
                    </div>
                </div>
            )}
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>

            {/* Live Attempts Feed (Visible unconditionally on right side if populated) */}
            {liveAttempts.length > 0 && !winnerDetails && (
                <div className="absolute top-24 right-8 w-64 space-y-2 z-20">
                    <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">Live Feed</h3>
                    {liveAttempts.map((att, i) => (
                        <div key={i} className="bg-brand-dark/80 backdrop-blur-md border border-brand-panel-border p-3 rounded-lg text-sm animate-in fade-in slide-in-from-right-4">
                            <span className="text-gray-300 font-bold">{att.client.name}</span> guessed <span className="text-red-400 font-mono line-through">{att.numericAnswer}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="relative z-10 w-full max-w-[95vw] lg:max-w-[90vw]">
                <Card>
                    {/* Header Section */}
                    <div className="flex justify-between items-center mb-8 pb-6 border-b border-brand-panel-border">
                        <div className="flex items-center gap-3">
                            <Zap className={isConnected ? "text-brand-cyan animate-pulse" : "text-gray-500"} />
                            <span className="font-bold text-xl tracking-widest text-brand-cyan hidden sm:inline">MATHX ROUND 2</span>
                        </div>

                        {/* Font Scaling Controls */}
                        <div className="flex items-center gap-1 bg-brand-dark/50 px-2 py-1 rounded-full border border-gray-700">
                            <button onClick={() => setFontScale(s => Math.max(0.7, s - 0.1))} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white" title="Decrease Font Size">
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-xs font-mono text-gray-400 w-8 text-center">{Math.round(fontScale * 100)}%</span>
                            <button onClick={() => setFontScale(s => Math.min(2.5, s + 0.1))} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white" title="Increase Font Size">
                                <ZoomIn size={18} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 bg-brand-dark px-4 py-2 rounded-full border border-brand-purple">
                            <Timer className="text-brand-purple" size={18} />
                            <span className="font-mono font-bold text-xl">{elapsed}s</span>
                        </div>
                    </div>

                    {!activeQuestion ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in zoom-in duration-500">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-brand-cyan/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                                <Timer className="text-brand-cyan absolute" size={32} />
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-cyan to-brand-purple animate-pulse">
                                    Waiting for question...
                                </h2>
                                <p className="text-gray-400 font-medium">Keep your fastest fingers ready!</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {winnerDetails ? (
                                <div className="text-center py-10 animate-in zoom-in duration-700 bg-green-500/5 rounded-2xl border border-green-500/10">
                                    <div className="inline-block p-6 rounded-full bg-green-500/20 mb-6 flex-center">
                                        <Trophy className="text-green-400" size={64} />
                                    </div>
                                    <h2 className="text-5xl font-black text-white mb-4">ROUND OVER</h2>
                                    <p className="text-2xl text-gray-300 mb-8">
                                        Team <span className="text-green-400 font-black">{winnerDetails.winnerName}</span> won in {winnerDetails.timeTaken}s!
                                    </p>
                                    <div className="p-6 bg-brand-dark/80 rounded-2xl border border-green-500/30 inline-block shadow-lg shadow-green-500/10">
                                        <p className="text-xs text-green-400/70 font-bold uppercase tracking-widest mb-2">Winning Answer</p>
                                        <p className="text-5xl font-mono text-white font-black">{winnerDetails.winningAnswer}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row gap-8 lg:gap-12 animate-in slide-in-from-bottom-4 duration-500">

                                    {/* Left Side - Question Area */}
                                    <div className="flex-none lg:w-[75%] flex flex-col justify-center">
                                        <div className="text-left mb-6">
                                            <h2 className="text-lg text-gray-400 font-medium mb-4 uppercase tracking-widest flex items-center gap-2">
                                                {activeQuestion.text}
                                            </h2>
                                            <div
                                                className="text-2xl sm:text-3xl py-12 px-8 bg-brand-dark/40 rounded-xl border border-brand-blue/30 glow-blue leading-relaxed break-words min-h-[300px] flex items-center justify-center text-center"
                                                style={{ fontSize: `${fontScale * 1.5}rem`, transition: 'font-size 0.2s ease-out' }}
                                            >
                                                {activeQuestion.mathText && (
                                                    <Latex>{activeQuestion.mathText}</Latex>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side - Input Area */}
                                    <div className="flex-none lg:w-[25%] flex flex-col items-center justify-center bg-brand-dark/20 p-6 rounded-2xl border border-brand-panel-border/50">
                                        <div className="w-full flex flex-col items-center gap-6 mb-8">
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Enter exact numerical answer"
                                                value={numericAnswer}
                                                onChange={(e) => !isLocked && setNumericAnswer(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleLock();
                                                }}
                                                disabled={isLocked}
                                                className={`w-full text-center text-3xl sm:text-4xl p-6 rounded-xl border-2 bg-brand-dark/60 outline-none transition-all duration-300 font-mono shadow-inner
                                                    ${isLocked
                                                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500 grayscale'
                                                        : 'border-brand-panel-border focus:border-brand-cyan focus:shadow-[0_0_20px_rgba(0,255,255,0.15)] text-white'
                                                    }
                                                `}
                                            />

                                            {/* Feedback Message */}
                                            <div className={`h-6 text-lg font-bold ${feedbackMsg.includes('Incorrect') ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                                                {feedbackMsg}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="w-full flex justify-center">
                                            <Button
                                                className="w-full py-6 text-xl sm:text-2xl tracking-widest uppercase font-black"
                                                variant={isLocked ? 'secondary' : 'glow'}
                                                onClick={handleLock}
                                                disabled={numericAnswer.trim() === '' || isLocked}
                                            >
                                                {isLocked ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Lock size={24} /> <span>Sending...</span>
                                                    </div>
                                                ) : (
                                                    'Lock Answer'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                </Card>
            </div>
        </div>
    );
};

export function FastFingersClient({ user }) {
    return (
        <ClientViewInner user={user} />
    );
}
