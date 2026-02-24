import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function ThemeButton({ children, className, variant = 'primary', ...props }) {
    const baseStyles = "relative inline-flex items-center justify-center px-6 py-3 font-bold rounded-xl transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed tracking-wide overflow-hidden group";

    const variants = {
        primary: "bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-purple)] text-white hover:scale-[1.02] shadow-[0_0_20px_rgba(176,38,255,0.4)] border border-white/20",
        secondary: "glass-panel text-[var(--color-gray-200)] hover:bg-white/10 hover:text-white hover:border-[var(--color-neon-cyan)] shadow-sm",
        cyan: "bg-[var(--color-slate-900)] text-[var(--color-neon-cyan)] neon-glow-cyan hover:bg-[var(--color-neon-cyan)] hover:text-black hover:shadow-[0_0_30px_rgba(0,243,255,0.6)]"
    };

    return (
        <button className={cn(baseStyles, variants[variant], className)} {...props}>
            <span className="relative z-10">{children}</span>
            {variant === 'primary' && (
                <span className="absolute inset-0 bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-cyan)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            )}
        </button>
    );
}
