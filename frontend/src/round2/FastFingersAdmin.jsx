import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Send, Trophy, Clock, Users, EyeOff, CheckCircle } from 'lucide-react';
import { useSocket, SocketProvider } from '../SocketContext';

const AdminViewInner = () => {
    const { socket, isConnected } = useSocket();
    const [questions, setQuestions] = useState([]);
    const [activeQuestionId, setActiveQuestionId] = useState(null);
    const [clients, setClients] = useState([]);
    const [winnerFound, setWinnerFound] = useState(false);

    useEffect(() => {
        if (!socket) return;

        // Fetch Round 2 questions on mount
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

        return () => {
            socket.off('server:round2:questions_list');
            socket.off('leaderboard:update');
            socket.off('server:round2:winner_found');
        };
    }, [socket]);

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

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-purple relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10 w-full pt-16 lg:pt-8 max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in zoom-in duration-500">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-cyan to-brand-purple">
                            MathX Admin Control
                        </h1>
                        <p className="text-gray-400 mt-2">Fastest Fingers First - Round 2</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2">
                            <Users className={isConnected ? "text-brand-cyan" : "text-gray-500"} size={20} />
                            <span className="font-bold">{isConnected ? 'Connected to Server' : 'Connecting...'}</span>
                        </div>
                    </div>
                </header>

                {winnerFound && (
                    <div className="w-full bg-green-500/20 border border-green-500 p-6 rounded-xl flex items-center justify-center gap-4 animate-bounce">
                        <CheckCircle className="text-green-500" size={32} />
                        <h2 className="text-2xl font-black text-green-400">WINNER FOUND! Round locked globally.</h2>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel - Question Flow Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Send className="text-brand-purple" />
                                    Question Bank
                                </h2>
                                {activeQuestionId && (
                                    <Button size="sm" variant="danger" onClick={handleHideQuestion} className="flex gap-2 items-center">
                                        <EyeOff size={16} /> Hide All
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {questions.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No questions with round = 2 found.</p>
                                ) : (
                                    questions.map((q, idx) => (
                                        <div key={q.id} className={`p-4 rounded-lg border transition-all ${activeQuestionId === q.id ? 'bg-brand-blue/10 border-brand-cyan shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'bg-brand-dark/50 border-brand-panel-border hover:border-brand-purple'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-sm font-bold text-gray-400">Q{idx + 1}</span>
                                                <span className="text-xs bg-brand-dark px-2 py-1 rounded-full text-brand-purple border border-brand-purple/30">
                                                    {q.marks || 10} Pts
                                                </span>
                                            </div>
                                            <p className="font-mono text-sm mb-4 line-clamp-2">{q.content?.text}</p>

                                            <Button
                                                variant={activeQuestionId === q.id ? "glow" : activeQuestionId ? "secondary" : "default"}
                                                className="w-full"
                                                onClick={() => handleSendQuestion(q.id)}
                                                disabled={activeQuestionId && activeQuestionId !== q.id}
                                            >
                                                {activeQuestionId === q.id ? 'Live / Retry' : 'Push Live'}
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Right Panel - Leaderboard */}
                    <div className="lg:col-span-2">
                        <Card className="h-full">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <Trophy className="text-brand-cyan" />
                                Live Feed & Fastest Responses
                            </h2>

                            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                {clients.length === 0 ? (
                                    <div className="text-center py-20 text-gray-500">
                                        Waiting for attempts...
                                    </div>
                                ) : (
                                    clients.map((client, idx) => (
                                        <div
                                            key={`${client.id}-${idx}`}
                                            className={`flex items-center justify-between p-4 rounded-xl border ${client.correct
                                                ? 'bg-brand-blue/20 border-brand-cyan glow-cyan shadow-[0_0_20px_rgba(0,255,255,0.2)]'
                                                : 'bg-red-500/5 border-red-500/20'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`text-2xl font-black ${client.correct ? 'text-brand-cyan' : 'text-gray-600'}`}>
                                                    #{idx + 1}
                                                </span>
                                                <span className={`font-bold text-lg ${client.correct ? 'text-white' : 'text-gray-300'}`}>{client.name}</span>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Answered:</p>
                                                    <p className={`font-mono font-black text-xl ${client.correct ? 'text-white' : 'text-red-400'}`}>
                                                        {client.answer}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${client.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                                                    {client.correct ? 'CORRECT' : 'INCORRECT'}
                                                </span>
                                                <div className={`flex items-center gap-2 font-mono text-lg w-24 justify-end ${client.correct ? 'text-brand-cyan' : 'text-gray-500'}`}>
                                                    <Clock size={16} />
                                                    {client.time}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
};

export function FastFingersAdmin() {
    return (
        <SocketProvider isAdmin={true}>
            <AdminViewInner />
        </SocketProvider>
    );
}
