import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyles = "px-6 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-brand-blue hover:bg-brand-cyan text-white glow-blue hover:glow-cyan",
        secondary: "bg-transparent border-2 border-brand-purple text-brand-cyan hover:bg-brand-purple/20 glow-purple",
        glow: "bg-brand-cyan text-brand-dark glow-cyan hover:bg-white hover:text-brand-blue hover:glow-blue",
        danger: "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
