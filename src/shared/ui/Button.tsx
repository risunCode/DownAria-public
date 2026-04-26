'use client';

import { forwardRef, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    children?: ReactNode;
}

const variants = {
    primary: 'surface-accent text-white shadow-sm hover:brightness-110 active:brightness-95',
    secondary: 'surface-card text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--accent-primary)]/30',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
    danger: 'bg-[var(--status-error)] text-white hover:brightness-110 active:brightness-95',
};

const sizes = {
    xs: 'px-2 py-1 text-[11px] rounded-[6px]',
    sm: 'px-3 py-1.5 text-sm rounded-[8px]',
    md: 'px-4 py-2.5 text-base rounded-[10px]',
    lg: 'px-6 py-3 text-lg rounded-[12px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'primary',
        size = 'md',
        isLoading = false,
        leftIcon,
        rightIcon,
        children,
        className = '',
        disabled,
        ...props
    }, ref) => {
        return (
            <motion.button
                ref={ref}
                whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
                className={`
          inline-flex items-center justify-center gap-2
          font-semibold transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : leftIcon ? (
                    leftIcon
                ) : null}
                {children}
                {!isLoading && rightIcon}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';
