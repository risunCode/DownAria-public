'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Link } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    success?: boolean;
    label?: string;
    helperText?: string;
    glowAnimation?: boolean;
    highlightOnFocus?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ error, success, label, helperText, glowAnimation = true, highlightOnFocus = true, className = '', onFocus, onBlur, ...props }, ref) => {
        const [isFocused, setIsFocused] = useState(false);

        const borderColor = error
            ? 'var(--error)'
            : success
                ? 'var(--success)'
                : isFocused && highlightOnFocus
                    ? 'color-mix(in srgb, var(--accent-primary) 50%, transparent)'
                    : 'var(--border-color)';

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={props.id} className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {/* Rotating gradient border - focus only */}
                    {glowAnimation && isFocused && (
                        <div
                            className="input-glow absolute -inset-[2px] rounded-lg opacity-80"
                            style={{ filter: 'blur(4px)' }}
                        />
                    )}

                    {/* Solid rotating border (visible line) */}
                    {glowAnimation && isFocused && (
                        <div
                            className="input-glow absolute -inset-[1px] rounded-lg opacity-70"
                        />
                    )}

                    {/* Input container */}
                    <div className="relative surface-muted rounded-lg">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10">
                            <Link className="w-5 h-5" />
                        </div>
                        <input
                            ref={ref}
                            style={{ borderColor }}
                            onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
                            onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
                            className={`
                                relative w-full pl-12 pr-12 py-4
                                bg-transparent
                                border-[1.5px] rounded-lg
                                text-[var(--text-primary)] text-base font-mono
                                placeholder:text-[var(--text-muted)]
                                transition-all duration-200
                                focus:outline-none
                                focus:border-[var(--accent-primary)]/50
                                focus:shadow-[0_0_20px_color-mix(in_srgb,var(--accent-primary)_12%,transparent)]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${className}
                            `}
                            {...props}
                        />
                        {(error || success) && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                                {error ? (
                                    <AlertCircle className="w-5 h-5 text-[var(--error)]" />
                                ) : (
                                    <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {(error || helperText) && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-2 text-sm ${error ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}
                    >
                        {error || helperText}
                    </motion.p>
                )}
                
            </div>
        );
    }
);

Input.displayName = 'Input';
