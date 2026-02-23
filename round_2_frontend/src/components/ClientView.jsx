import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Lock, Timer, Zap } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export const ClientView = () => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [lockedOption, setLockedOption] = useState(null);

    const options = [
        { id: 'A', text: '\\frac{\\pi}{2}' },
        { id: 'B', text: '\\frac{\\pi}{4}' },
        { id: 'C', text: '\\pi' },
        { id: 'D', text: '0' },
    ];

    const handleLock = () => {
        if (selectedOption) setLockedOption(selectedOption);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 animate-in fly-in slide-in-from-bottom-5 duration-700">
            <Card className="max-w-4xl w-full">

                {/* Header Section */}
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-brand-panel-border">
                    <div className="flex items-center gap-3">
                        <Zap className="text-brand-cyan animate-pulse" />
                        <span className="font-bold text-xl tracking-widest text-brand-cyan">MATHX ROUND 2</span>
                    </div>
                    <div className="flex items-center gap-2 bg-brand-dark px-4 py-2 rounded-full border border-brand-purple">
                        <Timer className="text-brand-purple" size={18} />
                        <span className="font-mono font-bold">14.05s</span>
                    </div>
                </div>

                {/* Question Area */}
                <div className="text-center mb-12">
                    <h2 className="text-2xl text-gray-300 font-medium mb-6">Evaluate the following integral:</h2>
                    <div className="text-4xl sm:text-5xl py-8 px-4 bg-brand-dark/40 rounded-xl border border-brand-blue/30 glow-blue">
                        <BlockMath math="\int_{0}^{\infty} \frac{\sin x}{x} dx" />
                    </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    {options.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => !lockedOption && setSelectedOption(opt.id)}
                            disabled={lockedOption !== null}
                            className={`
                relative px-6 py-6 rounded-xl text-left border-2 transition-all duration-300 transform
                ${lockedOption === opt.id
                                    ? 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-105'
                                    : selectedOption === opt.id
                                        ? 'border-brand-cyan bg-brand-cyan/10 glow-cyan scale-105'
                                        : 'border-brand-panel-border bg-brand-dark/60 hover:border-brand-purple hover:bg-brand-purple/10'
                                }
                ${lockedOption !== null && lockedOption !== opt.id ? 'opacity-50 grayscale' : ''}
              `}
                        >
                            <div className="flex items-center gap-6 text-2xl">
                                <span className={`font-black w-8 h-8 rounded-full flex items-center justify-center text-sm
                  ${selectedOption === opt.id ? 'bg-brand-cyan text-brand-dark' : 'bg-brand-panel text-gray-400'}
                `}>
                                    {opt.id}
                                </span>
                                <span className="flex-1 text-center">
                                    <InlineMath math={opt.text} />
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Action Button */}
                <div className="flex justify-center">
                    <Button
                        className="w-1/2 py-5 text-xl tracking-widest uppercase font-black"
                        variant={lockedOption ? 'secondary' : 'glow'}
                        onClick={handleLock}
                        disabled={!selectedOption || lockedOption !== null}
                    >
                        {lockedOption ? (
                            <>
                                <Lock size={24} /> Answer Locked
                            </>
                        ) : (
                            'Lock Answer'
                        )}
                    </Button>
                </div>

            </Card>
        </div>
    );
};
