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
    if (!socket) return undefined;

    socket.emit('admin:round2:fetch_questions');

    socket.on('server:round2:questions_list', (data) => {
      setQuestions(data);
    });

    socket.on('leaderboard:update', (data) => {
      const formatted = data.answers.map((ans) => ({
        id: ans.id,
        name: ans.client.name,
        time: `${ans.timeTaken}s`,
        answer: ans.numericAnswer,
        correct: ans.isCorrect,
      }));
      setClients(formatted);
      setWinnerFound(data.winnerFound);
    });

    socket.on('server:round2:winner_found', () => {
      setWinnerFound(true);
    });

    return () => {
      socket.off('server:round2:questions_list');
      socket.off('leaderboard:update');
      socket.off('server:round2:winner_found');
    };
  }, [socket]);

  const handleSendQuestion = (id) => {
    if (!socket) return;
    socket.emit('admin:round2:push_question', { id });
    setActiveQuestionId(id);
  };

  const handleHideQuestion = () => {
    if (!socket) return;
    socket.emit('admin:round2:hide_question');
    setActiveQuestionId(null);
    setClients([]);
    setWinnerFound(false);
  };

  return (
    <div className="relative h-[calc(100vh-5.75rem)] overflow-hidden bg-brand-dark text-white font-sans selection:bg-brand-purple">
      <div className="absolute top-0 right-0 h-[800px] w-[800px] rounded-full bg-brand-cyan/5 blur-[150px] translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-brand-purple/5 blur-[100px] -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1500px] flex-col gap-3 px-3 py-3">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h1 className="bg-gradient-to-r from-brand-cyan to-brand-purple bg-clip-text text-2xl font-black text-transparent">
              MathX Admin Control
            </h1>
            <p className="mt-1 text-sm text-gray-400">Fastest Fingers First</p>
          </div>
          <div className="glass-panel flex items-center gap-2 rounded-lg px-3 py-1.5">
            <Users className={isConnected ? 'text-brand-cyan' : 'text-gray-500'} size={16} />
            <span className="text-xs font-bold tracking-wide">{isConnected ? 'Connected to Server' : 'Connecting...'}</span>
          </div>
        </header>

        {winnerFound && (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-500 bg-green-500/20 px-3 py-2 animate-bounce">
            <CheckCircle className="text-green-500" size={18} />
            <h2 className="text-sm font-black uppercase tracking-wide text-green-400">Winner found. Round locked globally.</h2>
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="min-h-0 lg:col-span-4">
            <Card className="flex h-full min-h-[20rem] flex-col p-4 lg:min-h-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Send className="text-brand-purple" size={18} />
                  Question Bank
                </h2>
                {activeQuestionId && (
                  <Button variant="danger" onClick={handleHideQuestion} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    <EyeOff size={14} />
                    Hide All
                  </Button>
                )}
              </div>

              <div className="custom-scrollbar flex-1 min-h-0 max-h-full space-y-3 overflow-y-auto pr-1">
                {questions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">No questions with round = 2 found.</p>
                ) : (
                  questions.map((q, idx) => (
                    <div key={q.id} className={`rounded-lg border p-3 transition-all ${activeQuestionId === q.id ? 'bg-brand-blue/10 border-brand-cyan shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'bg-brand-dark/50 border-brand-panel-border hover:border-brand-purple'}`}>
                      <div className="mb-2 flex items-start justify-between">
                        <span className="text-sm font-bold text-gray-400">Q{idx + 1}</span>
                        <span className="rounded-full border border-brand-purple/30 bg-brand-dark px-2 py-1 text-[10px] text-brand-purple">
                          {q.marks || 10} Pts
                        </span>
                      </div>
                      <p className="mb-3 line-clamp-2 font-mono text-sm">{q.content?.text}</p>
                      <Button
                        variant={activeQuestionId === q.id ? 'glow' : activeQuestionId ? 'secondary' : 'primary'}
                        className="w-full px-3 py-2 text-xs"
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

          <div className="min-h-0 lg:col-span-8">
            <Card className="flex h-full min-h-[20rem] flex-col p-4 lg:min-h-0">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <Trophy className="text-brand-cyan" size={18} />
                Live Feed & Fastest Responses
              </h2>

              <div className="custom-scrollbar flex-1 min-h-0 max-h-full space-y-3 overflow-y-auto pr-1">
                {clients.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-500">Waiting for attempts...</div>
                ) : (
                  clients.map((client, idx) => (
                    <div key={`${client.id}-${idx}`} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${client.correct ? 'bg-brand-blue/20 border-brand-cyan glow-cyan shadow-[0_0_20px_rgba(0,255,255,0.2)]' : 'bg-red-500/5 border-red-500/20'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-black ${client.correct ? 'text-brand-cyan' : 'text-gray-600'}`}>#{idx + 1}</span>
                        <span className={`font-bold ${client.correct ? 'text-white' : 'text-gray-300'}`}>{client.name}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500">Answered:</p>
                          <p className={`font-mono text-lg font-black ${client.correct ? 'text-white' : 'text-red-400'}`}>{client.answer}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${client.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                          {client.correct ? 'CORRECT' : 'INCORRECT'}
                        </span>
                        <div className={`flex w-20 items-center justify-end gap-1.5 font-mono text-sm ${client.correct ? 'text-brand-cyan' : 'text-gray-500'}`}>
                          <Clock size={14} />
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
