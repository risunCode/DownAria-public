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
            whileHover={hover ? { y: -2 } : undefined}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            className={`
        glass-card p-6
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </motion.div>
    );
}

// Re-export from the dedicated skeleton file (single source of truth)
export { CardSkeleton } from '@/components/ui/Skeleton';
