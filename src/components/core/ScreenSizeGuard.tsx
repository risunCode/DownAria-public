'use client';

import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

const SHRINK_DELTA_PX = 8;

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
  const isShowingRef = useRef(false);
  const prevSizeRef = useRef<{ width: number; height: number } | null>(null);

  const shouldIgnoreResizeWarning = () => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || active.isContentEditable;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const showWarning = () => {
      if (isShowingRef.current || Swal.isVisible()) return;
      isShowingRef.current = true;

      void Swal.fire({
        icon: 'warning',
        title: 'Screen size change detected',
        html: 'Viewport kamu menyempit. Beberapa elemen bisa kurang nyaman dilihat. Coba putar device atau lebarkan jendela.',
        confirmButtonText: 'OK',
        allowOutsideClick: true,
        allowEscapeKey: true,
        showCloseButton: true,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        confirmButtonColor: 'var(--accent-primary)',
      }).finally(() => {
        isShowingRef.current = false;
      });
    };

    const checkAndWarn = () => {
      const current = getViewportSize();
      const previous = prevSizeRef.current;

      if (!previous) {
        prevSizeRef.current = current;
        return;
      }

      const widthShrunk = current.width < previous.width - SHRINK_DELTA_PX;
      const heightShrunk = current.height < previous.height - SHRINK_DELTA_PX;

      if ((widthShrunk || heightShrunk) && !shouldIgnoreResizeWarning()) {
        showWarning();
      }

      prevSizeRef.current = current;
    };

    const initTimer = window.setTimeout(() => {
      prevSizeRef.current = getViewportSize();
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
