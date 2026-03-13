import React, { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';
import { useSocket } from '../SocketContext';

export default function Round3Dashboard() {
    const { socket } = useSocket();
    const [activeSubRound, setActiveSubRound] = useState(0);

    useEffect(() => {
        if (!socket) return undefined;

        const handleStateUpdate = (state) => {
            setActiveSubRound(state?.activeSubRound || 0);
        };

        socket.on('server:round3:state_update', handleStateUpdate);
        socket.emit('client:round3:request_state');

        return () => {
            socket.off('server:round3:state_update', handleStateUpdate);
        };
    }, [socket]);

    const subRoundContent = {
        1: {
            title: 'MathX Direct Question Round',
            description: 'Prepare yourself. Direct questions are about to begin.'
        },
        2: {
            title: 'MathX Visual Round',
            description: 'Prepare yourself. Visual challenge questions are about to begin.'
        },
        3: {
            title: 'MathX Pass-On Round',
            description: 'Prepare yourself. The pass-on stage is about to begin.'
        },
        4: {
            title: 'MathX Buzzer Round',
            description: 'Prepare yourself. The buzzer stage is about to begin.'
        },
        5: {
            title: 'MathX Rapid Fire',
            description: 'Prepare yourself. Rapid fire is about to begin.'
        }
    };

    const currentContent = subRoundContent[activeSubRound] || {
        title: 'MathX Round 3',
        description: 'Prepare yourself. The final stage is about to begin.'
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-transparent">
            <div className="bg-black/40 p-12 rounded-[3rem] border border-[var(--color-neon-purple)]/30 backdrop-blur-md text-center max-w-2xl w-full mx-a shadow-[0_0_50px_rgba(188,19,254,0.1)]">
                <Rocket className="w-24 h-24 mx-auto mb-8 text-[var(--color-neon-purple)] animate-pulse" />
                <h1 className="text-5xl font-black text-white mb-4 tracking-widest uppercase">
                    {currentContent.title}
                </h1>
                <p className="text-xl text-[var(--color-gray-400)] mb-12">
                    {currentContent.description}
                </p>

                <div className="px-8 py-4 rounded-xl border border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] font-mono font-bold tracking-widest uppercase inline-block">
                    Awaiting Quizmaster Instructions...
                </div>
            </div>
        </div>
    );
}
