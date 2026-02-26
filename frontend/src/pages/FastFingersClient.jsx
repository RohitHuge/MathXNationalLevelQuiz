import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Lock, Timer, Zap } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { useSocket, SocketProvider } from '../SocketContext';

const ClientViewInner = () => {
    const { socket, isConnected } = useSocket();
    const [numericAnswer, setNumericAnswer] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState('0.00');

    useEffect(() => {
        if (!socket) return;

        socket.on('question:active', (question) => {
            setActiveQuestion(question);
            setIsLocked(false);
            setNumericAnswer('');
            setStartTime(Date.now());
            setElapsed('0.00');
        });

        return () => {
            socket.off('question:active');
        };
    }, [socket]);

    useEffect(() => {
        let interval;
        if (activeQuestion && !isLocked && startTime) {
            interval = setInterval(() => {
                setElapsed(((Date.now() - startTime) / 1000).toFixed(2));
            }, 50);
        }
        return () => clearInterval(interval);
    }, [activeQuestion, isLocked, startTime]);

    const handleLock = () => {
        if (numericAnswer.trim() !== '' && activeQuestion && !isLocked) {
            setIsLocked(true);
            socket.emit('client:submit_answer', {
                questionId: activeQuestion.id,
                numericAnswer: parseFloat(numericAnswer),
                timeTaken: parseFloat(elapsed)
            });
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-purple relative overflow-hidden flex items-center justify-center p-4 sm:p-8 animate-in fly-in slide-in-from-bottom-5 duration-700">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10 w-full max-w-4xl">
                <Card>
                    {/* Header Section */}
                    <div className="flex justify-between items-center mb-8 pb-6 border-b border-brand-panel-border">
                        <div className="flex items-center gap-3">
                            <Zap className={isConnected ? "text-brand-cyan animate-pulse" : "text-gray-500"} />
                            <span className="font-bold text-xl tracking-widest text-brand-cyan">MATHX ROUND 2</span>
                        </div>
                        <div className="flex items-center gap-2 bg-brand-dark px-4 py-2 rounded-full border border-brand-purple">
                            <Timer className="text-brand-purple" size={18} />
                            <span className="font-mono font-bold">{elapsed}s</span>
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
                            {/* Question Area */}
                            <div className="text-center mb-12 animate-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-2xl text-gray-300 font-medium mb-6">
                                    {activeQuestion.text}
                                </h2>
                                <div className="text-4xl sm:text-5xl py-8 px-4 bg-brand-dark/40 rounded-xl border border-brand-blue/30 glow-blue">
                                    {activeQuestion.mathText && (
                                        <BlockMath math={activeQuestion.mathText} />
                                    )}
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="flex flex-col items-center gap-6 mb-10 animate-in slide-in-from-bottom-6 duration-500">
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Enter numerical answer..."
                                    value={numericAnswer}
                                    onChange={(e) => !isLocked && setNumericAnswer(e.target.value)}
                                    disabled={isLocked}
                                    className={`w-full max-w-md text-center text-4xl p-4 rounded-xl border-2 bg-brand-dark/60 outline-none transition-all duration-300 font-mono
                                    ${isLocked
                                            ? 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)] text-green-400 opacity-90 grayscale'
                                            : 'border-brand-panel-border focus:border-brand-cyan focus:shadow-[0_0_15px_rgba(0,255,255,0.2)] text-white'
                                        }
                                `}
                                />
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-center animate-in slide-in-from-bottom-8 duration-500">
                                <Button
                                    className="w-1/2 max-w-sm py-5 text-xl tracking-widest uppercase font-black"
                                    variant={isLocked ? 'secondary' : 'glow'}
                                    onClick={handleLock}
                                    disabled={numericAnswer.trim() === '' || isLocked}
                                >
                                    {isLocked ? (
                                        <>
                                            <Lock size={24} /> Answer Locked
                                        </>
                                    ) : (
                                        'Lock Answer'
                                    )}
                                </Button>
                            </div>
                        </>
                    )}

                </Card>
            </div>
        </div>
    );
};

export function FastFingersClient() {
    return (
        <SocketProvider isAdmin={false} clientName={`Team-${Math.floor(Math.random() * 1000)}`}>
            <ClientViewInner />
        </SocketProvider>
    );
}
