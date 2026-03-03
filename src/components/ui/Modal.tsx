'use client';

import { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showTitle?: boolean;
    bodyClassName?: string;
    panelClassName?: string;
    header?: React.ReactNode;
    backdropClassName?: string;
}

const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
};

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showTitle = true,
    bodyClassName,
    panelClassName,
    header,
    backdropClassName,
}: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
    const titleId = useId();
    const hasVisibleTitle = Boolean(!header && title && showTitle);

    // Close on escape key and trap basic tab navigation
    useEffect(() => {
        const getFocusableElements = () => {
            if (!dialogRef.current) return [] as HTMLElement[];
            return Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            if (e.key !== 'Tab' || !dialogRef.current) return;

            const focusable = getFocusableElements();
            if (focusable.length === 0) {
                e.preventDefault();
                dialogRef.current.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey) {
                if (active === first || !dialogRef.current.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
                return;
            }

            if (!dialogRef.current.contains(active)) {
                e.preventDefault();
                first.focus();
                return;
            }

            if (active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        if (isOpen) {
            previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';

            const focusable = getFocusableElements();
            const initialFocusTarget = focusable[0] ?? dialogRef.current;
            window.setTimeout(() => {
                initialFocusTarget?.focus();
            }, 0);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen && previouslyFocusedElementRef.current) {
            previouslyFocusedElementRef.current.focus();
            previouslyFocusedElementRef.current = null;
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className={`modal-theme-backdrop fixed inset-0 z-50 ${backdropClassName || ''}`}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={hasVisibleTitle ? titleId : undefined}
                        aria-label={!hasVisibleTitle ? title || 'Dialog' : undefined}
                        tabIndex={-1}
                        className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-full ${sizes[size]} ${header || bodyClassName ? '' : 'p-6'}
              bg-[var(--bg-card)] border border-[var(--border-color)]
              rounded-2xl shadow-2xl z-50
              ${panelClassName || ''}
            `}
                    >
                        {/* Header */}
                        {header ? (
                            header
                        ) : title && showTitle ? (
                            <div className="flex items-center justify-between mb-4">
                                <h2 id={titleId} className="text-xl font-bold text-[var(--text-primary)]">
                                    {title}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                                </button>
                            </div>
                        ) : null}

                        {/* Content */}
                        <div className={bodyClassName || ''}>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
