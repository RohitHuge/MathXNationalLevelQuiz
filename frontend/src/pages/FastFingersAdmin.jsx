import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Send, Trophy, Clock, Users } from 'lucide-react';
import { useSocket, SocketProvider } from '../SocketContext';

const AdminViewInner = () => {
    const { socket, isConnected } = useSocket();
    const [questionSent, setQuestionSent] = useState(false);
    const [clients, setClients] = useState([]);

    useEffect(() => {
        if (!socket) return;

        socket.on('leaderboard:update', (data) => {
            const formatted = data.answers.map(ans => ({
                id: ans.id,
                name: ans.client.name,
                time: `${ans.timeTaken}s`,
                answer: ans.numericAnswer,
                correct: ans.isCorrect
            }));
            setClients(formatted);
        });

        return () => {
            socket.off('leaderboard:update');
        };
    }, [socket]);

    const handleSendQuestion = () => {
        if (socket) {
            // Hardcoded question ID for the MVP scenario, could be dynamic
            socket.emit('admin:send_question', { id: 'mathx-q1' });
            setQuestionSent(true);
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Panel - Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                <Send className="text-brand-purple" />
                                Question Control
                            </h2>
                            <div className="space-y-4">
                                <div className="bg-brand-dark/50 p-4 rounded-lg border border-brand-panel-border">
                                    <p className="text-sm text-gray-400 mb-1">Current Question</p>
                                    <p className="font-mono text-lg">Q1. Integration Limits</p>
                                </div>

                                <Button
                                    variant={questionSent ? "secondary" : "glow"}
                                    className="w-full py-4 text-lg"
                                    onClick={handleSendQuestion}
                                >
                                    {questionSent ? 'Question Sent' : 'Send Question 1'}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Right Panel - Leaderboard */}
                    <div className="lg:col-span-2">
                        <Card className="h-full">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <Trophy className="text-brand-cyan" />
                                Fastest Responses
                            </h2>

                            <div className="space-y-3">
                                {clients.map((client, idx) => (
                                    <div
                                        key={client.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border ${idx === 0 && client.correct
                                            ? 'bg-brand-blue/20 border-brand-cyan glow-cyan'
                                            : 'bg-brand-dark/50 border-brand-panel-border hover:border-brand-purple transition-colors'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`text-2xl font-black ${idx === 0 ? 'text-brand-cyan' : 'text-gray-500'}`}>
                                                #{idx + 1}
                                            </span>
                                            <span className="font-bold text-lg">{client.name}</span>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-400">Answered:</p>
                                                <p className="font-mono font-black text-xl">{client.answer}</p>
                                            </div>
                                            {client.correct !== null && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${client.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {client.correct ? 'CORRECT' : 'INCORRECT'}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 font-mono text-xl w-24 justify-end text-brand-cyan">
                                                <Clock size={16} />
                                                {client.time}
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
