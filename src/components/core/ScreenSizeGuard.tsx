'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const WIDTH_SHRINK_DELTA_PX = 24;
const OVERFLOW_TOLERANCE_PX = 6;
const WARNING_COOLDOWN_MS = 8000;

function getViewportSize(): { width: number; height: number } {
  if (window.visualViewport) {
    return {
      width: Math.floor(window.visualViewport.width),
      height: Math.floor(window.visualViewport.height),
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function ScreenSizeGuard() {
  const t = useTranslations('screenSizeGuard');
  const prevSizeRef = useRef<{ width: number; height: number } | null>(null);
  const lastWarningAtRef = useRef(0);

  const shouldIgnoreResizeWarning = () => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || active.isContentEditable;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasHorizontalOverflow = () => {
      const doc = document.documentElement;
      if (!doc) return false;
      const viewportWidth = Math.floor(window.innerWidth);
      return doc.scrollWidth - viewportWidth > OVERFLOW_TOLERANCE_PX;
    };

    const showWarning = () => {
      const now = Date.now();
      if (now - lastWarningAtRef.current < WARNING_COOLDOWN_MS) return;
      lastWarningAtRef.current = now;
      toast.warning(t('title'), {
        description: t('message'),
        duration: 5000,
        id: 'screen-size-warning',
      });
    };

    const checkAndWarn = () => {
      const current = getViewportSize();
      const previous = prevSizeRef.current;

      if (!previous) {
        prevSizeRef.current = current;
        return;
      }

      const widthShrunk = current.width < previous.width - WIDTH_SHRINK_DELTA_PX;
      const horizontalOverflow = hasHorizontalOverflow();

      // Ignore height-only viewport changes from mobile browser chrome while scrolling.
      if (!shouldIgnoreResizeWarning() && (horizontalOverflow || (widthShrunk && horizontalOverflow))) {
        showWarning();
      }

      prevSizeRef.current = current;
    };

    const initTimer = window.setTimeout(() => {
      prevSizeRef.current = getViewportSize();
      // Initial check catches real horizontal overflow without waiting for resize events.
      if (!shouldIgnoreResizeWarning() && hasHorizontalOverflow()) {
        showWarning();
      }
    }, 120);

    const onResize = () => {
      checkAndWarn();
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.clearTimeout(initTimer);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  return null;
}

export default ScreenSizeGuard;
