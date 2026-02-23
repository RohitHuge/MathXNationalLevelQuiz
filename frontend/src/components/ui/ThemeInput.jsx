import React from 'react';
import { cn } from './ThemeButton';

export function ThemeInput({ className, label, type = "text", error, ...props }) {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label className="text-sm font-medium text-[var(--color-gray-200)] pb-1">
                    {label}
                </label>
            )}
            <input
                type={type}
                className={cn(
                    "w-full bg-[var(--color-slate-800)] border border-gray-700 text-white px-4 py-2.5 rounded-lg",
                    "focus:outline-none focus:border-[var(--color-blue-500)] focus:ring-1 focus:ring-[var(--color-blue-500)]",
                    "transition-all duration-200 placeholder:text-gray-500",
                    error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                    className
                )}
                {...props}
            />
            {error && (
                <span className="text-xs text-red-500 font-medium mt-1">
                    {error}
                </span>
            )}
        </div>
    );
}
