'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getUpdateDismissed, setUpdateDismissed } from '@/shared/storage';
import { createLogger } from '@/shared/runtime';

const pwaLogger = createLogger('PWA');
const IS_DEV = process.env.NODE_ENV !== 'production';

interface UpdatePromptSettings {
  enabled: boolean;
  mode: 'always' | 'once' | 'session';
  delay_seconds: number;
  dismissable: boolean;
  custom_message: string;
}

const DEFAULT_SETTINGS: UpdatePromptSettings = {
  enabled: true,
  mode: 'always',
  delay_seconds: 0,
  dismissable: true,
  custom_message: '',
};

// Session storage key for session-based dismissal (not persisted)
const SESSION_STORAGE_KEY = 'downaria_update_dismissed_session';

/**
 * Force clear all caches and reload
 * Can be called from console: window.forceRefresh()
 */
export async function forceRefresh(): Promise<void> {
  pwaLogger.debug('Force refreshing...');

  // 1. Clear all caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    pwaLogger.debug('Cleared caches', cacheNames);
  }

  // 2. Unregister service worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    pwaLogger.debug('Unregistered service workers');
  }

  // 3. Clear localStorage cache keys (keep user settings)
  const keysToRemove = Object.keys(localStorage).filter(k =>
    k.startsWith('cache_') || k.startsWith('xtf_cache_')
  );
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // 4. Hard reload
  window.location.reload();
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).forceRefresh = forceRefresh;
}

export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [settings, setSettings] = useState<UpdatePromptSettings>(DEFAULT_SETTINGS);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const isReloadingRef = useRef(false);

  const markUpdateAvailable = useCallback((worker: ServiceWorker | null | undefined) => {
    if (!worker) return;
    waitingWorkerRef.current = worker;
    setUpdateAvailable(true);
    pwaLogger.debug('New version available');
  }, []);

  // Check if prompt should be shown based on mode
  const shouldShowPrompt = useCallback((mode: UpdatePromptSettings['mode']): boolean => {
    if (mode === 'always') return true;

    if (mode === 'once') {
      // Check unified settings - if dismissed forever, never show again
      const dismissed = getUpdateDismissed();
      return dismissed !== 'forever';
    }

    if (mode === 'session') {
      // Check sessionStorage - if dismissed this session, don't show
      const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return dismissed !== 'session';
    }

    return true;
  }, []);

  // Show prompt when update available (with delay and mode check)
  useEffect(() => {
    if (!updateAvailable || !settings.enabled) return;

    if (!shouldShowPrompt(settings.mode)) {
      pwaLogger.debug('Update prompt dismissed by user preference');
      return;
    }

    const delay = (settings.delay_seconds || 0) * 1000;
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [updateAvailable, settings, shouldShowPrompt]);

  useEffect(() => {
    if (IS_DEV) {
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          void Promise.all(registrations.map((registration) => registration.unregister()));
        });
      }

      if ('caches' in window) {
        void caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))));
      }

      return;
    }

    // Track online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    const handleControllerChange = () => {
      if (isReloadingRef.current) return;
      isReloadingRef.current = true;
      window.location.reload();
    };

    // Register service worker
    let updateInterval: NodeJS.Timeout | null = null;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' }) // Always check for SW updates
        .then((registration) => {
          pwaLogger.debug('Service Worker registered');

          if (registration.waiting) {
            markUpdateAvailable(registration.waiting);
          }

          // Force check for updates immediately on page load
          void registration.update();

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  markUpdateAvailable(newWorker);
                }
              });
            }
          });

          // Check for updates periodically (every 5 min instead of 30)
          updateInterval = setInterval(() => {
            void registration.update();
          }, 5 * 60 * 1000);
        })
        .catch((error) => {
          pwaLogger.error('SW registration failed', error);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      if (updateInterval) clearInterval(updateInterval);
    };
  }, [markUpdateAvailable]);

  // Update prompt - user must click to reload
  const handleUpdate = () => {
    const waitingWorker = waitingWorkerRef.current;
    if (waitingWorker) {
      setShowPrompt(false);
      waitingWorker.postMessage('skipWaiting');
      return;
    }

    window.location.reload();
  };

  // Dismiss handler based on mode
  const handleDismiss = () => {
    if (settings.mode === 'once') {
      setUpdateDismissed('forever');
    } else if (settings.mode === 'session') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'session');
    }
    setShowPrompt(false);
  };

  const promptMessage = settings.custom_message || 'Refresh to get the latest features.';

  return (
    <>
      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg bg-yellow-500/90 text-black text-sm font-medium shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-yellow-800 animate-pulse" />
          Offline Mode
        </div>
      )}

      {/* Update available prompt */}
      {showPrompt && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-primary)] shadow-xl animate-fade-in max-w-xs">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
            🎉 New version available!
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {promptMessage}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Update Now
            </button>
            {settings.dismissable && (
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                Later
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
