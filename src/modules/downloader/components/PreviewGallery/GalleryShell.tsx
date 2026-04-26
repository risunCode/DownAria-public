'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { TrafficLights } from '@/shared/ui/TrafficLights';

const MODAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const OVERLAY_TRANSITION = { duration: 0.24, ease: MODAL_EASE };
const PANEL_TRANSITION = { duration: 0.28, ease: MODAL_EASE };

interface GalleryShellProps {
  mode: 'fullscreen' | 'modal';
  isOpen: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function GalleryShell({ mode, isOpen, onClose, footer, children }: GalleryShellProps) {
  if (mode === 'fullscreen') {
    return (
      <FullscreenWrapper isOpen={isOpen} onClose={onClose} footer={footer}>
        {children}
      </FullscreenWrapper>
    );
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} footer={footer}>
      {children}
    </ModalWrapper>
  );
}

function ModalWrapper({
  children,
  isOpen,
  onClose,
  footer,
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={OVERLAY_TRANSITION}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={PANEL_TRANSITION}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-[var(--border-color)] modal-solid"
            style={{ backgroundColor: 'rgb(var(--bg-card-rgb))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0">
              <TrafficLights onClose={onClose} title="Preview" />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {children}
            </div>
            {footer && (
              <div className="flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FullscreenWrapper({
  children,
  isOpen,
  onClose,
  footer,
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const touchStartY = useRef(0);
  const currentDragY = useRef(0);
  const isDragging = useRef(false);
  const isAtTop = useRef(true);
  const wasPlaying = useRef(false);

  const [isClosingBySwipe, setIsClosingBySwipe] = useState(false);

  const pauseMedia = useCallback(() => {
    const videos = sheetRef.current?.querySelectorAll('video');
    const audios = sheetRef.current?.querySelectorAll('audio');
    videos?.forEach((video) => {
      if (!video.paused) {
        wasPlaying.current = true;
        video.pause();
      }
    });
    audios?.forEach((audio) => {
      if (!audio.paused) {
        wasPlaying.current = true;
        audio.pause();
      }
    });
  }, []);

  const resumeMedia = useCallback(() => {
    if (wasPlaying.current) {
      const videos = sheetRef.current?.querySelectorAll('video');
      const audios = sheetRef.current?.querySelectorAll('audio');
      videos?.forEach((video) => video.play().catch(() => {}));
      audios?.forEach((audio) => audio.play().catch(() => {}));
      wasPlaying.current = false;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isAtTop.current = (contentRef.current?.scrollTop || 0) <= 5;
    currentDragY.current = 0;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const deltaY = e.touches[0].clientY - touchStartY.current;

      if (isAtTop.current && deltaY > 10) {
        if (!isDragging.current) {
          isDragging.current = true;
          pauseMedia();
        }

        e.preventDefault();
        currentDragY.current = Math.min(deltaY * 0.5, 250);

        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(${currentDragY.current}px)`;
          sheetRef.current.style.opacity = `${1 - currentDragY.current / 400}`;
        }
        if (backdropRef.current) {
          backdropRef.current.style.opacity = `${0.5 - currentDragY.current / 600}`;
        }
      }
    },
    [pauseMedia]
  );

  const handleTouchEnd = useCallback(() => {
    if (isDragging.current) {
      const shouldClose = currentDragY.current > 80;

      if (shouldClose) {
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
          sheetRef.current.style.transform = 'translateY(100%)';
          sheetRef.current.style.opacity = '0';
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = 'opacity 0.25s ease-out';
          backdropRef.current.style.opacity = '0';
        }
        setIsClosingBySwipe(true);
        setTimeout(onClose, 250);
      } else {
        requestAnimationFrame(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out';
            sheetRef.current.style.transform = 'translateY(0)';
            sheetRef.current.style.opacity = '1';
          }
          if (backdropRef.current) {
            backdropRef.current.style.transition = 'opacity 0.3s ease-out';
            backdropRef.current.style.opacity = '0.5';
          }
        });
        resumeMedia();
      }

      setTimeout(() => {
        if (sheetRef.current && !isDragging.current) {
          sheetRef.current.style.transition = '';
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = '';
        }
      }, 350);

      isDragging.current = false;
      currentDragY.current = 0;
    }
  }, [onClose, resumeMedia]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !isOpen) return;

    sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
    sheet.addEventListener('touchmove', handleTouchMove, { passive: false });
    sheet.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    if (isOpen) {
      setIsClosingBySwipe(false);
      const timer = setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = '';
          sheetRef.current.style.opacity = '';
          sheetRef.current.style.transition = '';
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = '';
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (isClosingBySwipe) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            ref={backdropRef}
            key="fullscreen-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={OVERLAY_TRANSITION}
            className="fixed inset-0 z-50 bg-black"
            onClick={onClose}
          />

          <motion.div
            ref={sheetRef}
            key="fullscreen"
            initial={{ y: 32, opacity: 0, scale: 0.995 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.995 }}
            transition={PANEL_TRANSITION}
            className="fixed inset-x-0 bottom-0 z-50 bg-[var(--bg-card)] rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col modal-solid"
            style={{
              boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="sticky top-0 z-10 bg-[var(--bg-card)] border-b border-[var(--border-color)]/50">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="-ml-4 -my-3">
                  <TrafficLights onClose={onClose} title="Preview" />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span className="text-xs font-medium">Sembunyikan</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={contentRef}
              className="overflow-y-auto flex-1 min-h-0 pb-safe overscroll-contain scrollbar-hide"
              style={{ maxHeight: footer ? 'calc(92vh - 70px - 120px)' : 'calc(92vh - 70px)' }}
            >
              {children}
            </div>

            {footer && (
              <div className="flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
