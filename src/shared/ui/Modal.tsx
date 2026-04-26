'use client';

import { useEffect, useCallback, useRef, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/utils/cn';
import { TrafficLights } from '@/shared/ui/TrafficLights';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showTrafficLights?: boolean;
  showTitle?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  lockScroll?: boolean;
  disableClose?: boolean;
  zIndexClassName?: string;
  containerClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  header?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showTrafficLights = true,
  showTitle = false,
  closeOnEscape = true,
  closeOnBackdrop = true,
  lockScroll = true,
  disableClose = false,
  zIndexClassName = 'z-[9999]',
  containerClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  header,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const tryClose = useCallback(() => {
    if (!disableClose) {
      onClose();
    }
  }, [disableClose, onClose]);

  const getFocusableElements = useCallback(() => {
    if (!panelRef.current) return [] as HTMLElement[];
    return Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('aria-hidden'));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    const focusTimer = window.setTimeout(() => {
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panelRef.current?.focus();
      }
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        tryClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);

      if (lockScroll) {
        document.body.style.overflow = previousOverflow;
      }

      if (previousActiveElement.current && previousActiveElement.current.isConnected) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, lockScroll, closeOnEscape, tryClose, getFocusableElements]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!closeOnBackdrop) return;
      if (event.target === event.currentTarget) {
        tryClose();
      }
    },
    [closeOnBackdrop, tryClose]
  );

  const backdropVariants = {
    hidden: {
      opacity: 0,
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
    },
    visible: {
      opacity: 1,
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
    },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.98, y: 14 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 420,
        damping: 34,
        mass: 0.9,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      y: 10,
      transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn('fixed inset-0 flex items-center justify-center p-3 sm:p-4', zIndexClassName, containerClassName)}
        >
          <motion.div
            data-testid="modal-backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleBackdropClick}
          />

          <motion.div
            ref={panelRef}
            className={cn(
              'relative z-10 w-full rounded-2xl border border-[var(--border-color)] shadow-xl modal-solid',
              'max-h-[min(92vh,44rem)] overflow-y-auto overscroll-contain',
              sizeClasses[size],
              panelClassName
            )}
            style={{ backgroundColor: 'rgb(var(--bg-card-rgb))' }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            tabIndex={-1}
            aria-modal="true"
            role="dialog"
            aria-labelledby={showTitle && title ? 'modal-title' : undefined}
          >
            {header ?? (
              <>
                {showTrafficLights && <TrafficLights onClose={tryClose} title={title || ''} />}
                {showTitle && title && (
                  <div className={cn('px-6 pt-4', headerClassName)}>
                    <h2 id="modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
                      {title}
                    </h2>
                  </div>
                )}
              </>
            )}
            <div className={cn(bodyClassName)}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
