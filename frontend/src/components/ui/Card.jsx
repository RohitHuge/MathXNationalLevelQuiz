import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
    return (
        <div
            className={`glass-panel rounded-2xl p-6 shadow-2xl relative overflow-hidden ${className}`}
            {...props}
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-purple"></div>
            {children}
        </div>
    );
};
