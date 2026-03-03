'use client';

import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

const MOBILE_MAX_WIDTH = 768;
const OVERFLOW_TOLERANCE_PX = 14;
const WARNING_COOLDOWN_MS = 60_000;
const SESSION_DISMISSED_KEY = 'screen-size-guard-dismissed';
const SESSION_COOLDOWN_KEY = 'screen-size-guard-cooldown-until';

function isMobileLayoutOverflowing(): boolean {
  const isMobileView = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
  if (!isMobileView) return false;

  const docWidth = document.documentElement?.scrollWidth || 0;
  const bodyWidth = document.body?.scrollWidth || 0;
  const renderedWidth = Math.max(docWidth, bodyWidth);
  const viewportWidth = window.innerWidth;

  return renderedWidth - viewportWidth > OVERFLOW_TOLERANCE_PX;
}

export function ScreenSizeGuard() {
  const isShowingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isDismissedForSession = () => window.sessionStorage.getItem(SESSION_DISMISSED_KEY) === '1';
    const isOnCooldown = () => {
      const cooldownUntil = Number(window.sessionStorage.getItem(SESSION_COOLDOWN_KEY) || '0');
      return Number.isFinite(cooldownUntil) && Date.now() < cooldownUntil;
    };
    const setCooldown = () => {
      window.sessionStorage.setItem(SESSION_COOLDOWN_KEY, String(Date.now() + WARNING_COOLDOWN_MS));
    };

    const maybeShowWarning = () => {
      const abnormal = isMobileLayoutOverflowing();

      if (!abnormal) {
        return;
      }

      if (isShowingRef.current || Swal.isVisible() || isDismissedForSession() || isOnCooldown()) return;
      isShowingRef.current = true;
      setCooldown();

      void Swal.fire({
        icon: 'warning',
        title: 'Display issue detected',
        html: 'This screen size may cause layout overflow. For a better experience, try rotating your device or increasing the viewport width.',
        confirmButtonText: 'OK',
        allowOutsideClick: true,
        allowEscapeKey: true,
        showCloseButton: true,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        confirmButtonColor: 'var(--accent-primary)',
      }).then(() => {
        window.sessionStorage.setItem(SESSION_DISMISSED_KEY, '1');
      }).finally(() => {
        isShowingRef.current = false;
      });
    };

    const initTimer = window.setTimeout(maybeShowWarning, 120);

    const onResize = () => {
      maybeShowWarning();
    };

    const poll = window.setInterval(maybeShowWarning, 1400);

    window.addEventListener('resize', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(poll);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  return null;
}

export default ScreenSizeGuard;
