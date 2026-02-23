import React from 'react';
import { cn } from './ThemeButton';

export function ThemeCard({ children, className, highlighted = false, glowColor = 'none', ...props }) {
    const glowStyles = {
        none: "",
        cyan: "neon-glow-cyan",
        purple: "neon-glow-purple",
        blue: "neon-glow-blue"
    };

    return (
        <div
            className={cn(
                "glass-panel rounded-2xl p-6 transition-all duration-300 relative overflow-hidden",
                highlighted && glowColor === 'none' && "neon-glow-cyan",
                glowStyles[glowColor],
                className
            )}
            {...props}
        >
            {/* Subtle top edge highlight for glass effect */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
