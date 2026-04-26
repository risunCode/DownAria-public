'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Lock, Shield, X } from 'lucide-react';

import { Modal } from '@/shared/ui/Modal';
import { TrafficLights } from '@/shared/ui/TrafficLights';

interface ResponseJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  responseJsonText: string;
  onCopy?: () => void;
  title?: string;
}

interface CookieInfoModalProps {
  isOpen: boolean;
  isPrivateContent: boolean;
  platform: string;
  cookieSource?: 'client' | 'server' | 'none';
  onClose: () => void;
}

const MODAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const OVERLAY_TRANSITION = { duration: 0.24, ease: MODAL_EASE };
const PANEL_TRANSITION = { duration: 0.28, ease: MODAL_EASE };

export function ResponseJsonModal({
  isOpen,
  onClose,
  responseJsonText,
  onCopy,
  title = 'Response JSON',
}: ResponseJsonModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showTitle
      bodyClassName="p-4"
      panelClassName="max-w-2xl"
      header={
        <>
          <div className="relative">
            <TrafficLights onClose={onClose} title={title} />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span>Sembunyikan</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 pt-4 flex items-center justify-between gap-3">
            <h2 id="modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {onCopy && (
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                Copy response
              </button>
            )}
          </div>
        </>
      }
    >
      <pre className="max-h-[60vh] overflow-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words">
        {responseJsonText}
      </pre>
    </Modal>
  );
}

export function CookieInfoModal({
  isOpen,
  isPrivateContent,
  platform,
  cookieSource,
  onClose,
}: CookieInfoModalProps) {
  if (!isPrivateContent) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="cookie-info-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={OVERLAY_TRANSITION}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="cookie-info-panel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={PANEL_TRANSITION}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl modal-solid"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Private Content</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                This content requires authentication to access.
              </p>
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 flex-shrink-0">
                    <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Cookie Source</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {cookieSource === 'client' ? (
                        <>
                          <span className="text-[var(--accent-primary)] font-medium">Your Cookie</span>
                          {' '}- Using your personal authentication
                        </>
                      ) : cookieSource === 'server' ? (
                        <>
                          <span className="text-blue-400 font-medium">Server Cookie</span>
                          {' '}- Using shared server authentication
                        </>
                      ) : (
                        <>
                          <span className="text-amber-400 font-medium">Authenticated</span>
                          {' '}- Cookie authentication used
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-[var(--text-muted)]">
                  <span className="text-blue-400 font-medium">Platform:</span>{' '}
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                <p className="text-xs text-green-400">
                  🔒 Your cookies are encrypted and stored locally in your browser. They are never sent to our servers
                  unencrypted.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-medium hover:bg-[var(--accent-primary)]/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
