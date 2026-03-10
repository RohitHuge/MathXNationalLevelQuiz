import React from 'react';
import { Rocket } from 'lucide-react';

export default function Round3Dashboard() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-transparent">
            <div className="bg-black/40 p-12 rounded-[3rem] border border-[var(--color-neon-purple)]/30 backdrop-blur-md text-center max-w-2xl w-full mx-a shadow-[0_0_50px_rgba(188,19,254,0.1)]">
                <Rocket className="w-24 h-24 mx-auto mb-8 text-[var(--color-neon-purple)] animate-pulse" />
                <h1 className="text-5xl font-black text-white mb-4 tracking-widest uppercase">
                    MathX Buzzer Round
                </h1>
                <p className="text-xl text-[var(--color-gray-400)] mb-12">
                    Prepare yourself. The final stage is about to begin.
                </p>

                <div className="px-8 py-4 rounded-xl border border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] font-mono font-bold tracking-widest uppercase inline-block">
                    Awaiting Quizmaster Instructions...
                </div>
            </div>
        </div>
    );
}
