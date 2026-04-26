import { useEffect, useCallback, useRef, useState } from 'react';

export function useKeyboardNavigation(
  onClose: () => void,
  onPrev: () => void,
  onNext: () => void,
  isOpen: boolean
) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);
}

export function useSwipeNavigation(onPrev: () => void, onNext: () => void, enabled: boolean) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    touchStartX.current = e.touches[0].clientX;
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    touchEndX.current = e.touches[0].clientX;
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        onNext();
      } else {
        onPrev();
      }
    }
  }, [enabled, onPrev, onNext]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

export function useMediaGalleryMode() {
  const [mode, setMode] = useState<'modal' | 'fullscreen'>('modal');

  useEffect(() => {
    const checkMode = () => {
      setMode(window.innerWidth < 768 ? 'fullscreen' : 'modal');
    };
    checkMode();
    window.addEventListener('resize', checkMode);
    return () => window.removeEventListener('resize', checkMode);
  }, []);

  return mode;
}
