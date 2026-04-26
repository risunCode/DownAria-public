'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export function Card({ children, className = '', hover = true, onClick }: CardProps) {
    return (
        <motion.div
            whileHover={hover ? { y: -3 } : undefined}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={onClick}
            className={`
        surface-card glass-card p-6
        ${hover ? 'hover:border-[var(--accent-primary)]/30 hover:shadow-lg' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </motion.div>
    );
}

// Re-export from the dedicated skeleton file (single source of truth)
export { CardSkeleton } from '@/shared/ui/Skeleton';
