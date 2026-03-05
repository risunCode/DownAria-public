'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseNavigationGuardOptions {
    /** Whether the guard is active (e.g., download in progress) */
    isActive: boolean;
    /** Called when user tries to leave — return true to allow, false to block */
    onConfirmLeave?: () => Promise<boolean>;
    /** Message shown in paste-block toast */
    pasteBlockMessage?: string;
    /** Enable browser beforeunload prompt */
    useBeforeUnload?: boolean;
    /** beforeunload prompt message */
    beforeUnloadMessage?: string;
    /** Message shown in popstate-block toast */
    popstateBlockMessage?: string;
}

/**
 * Hook to block navigation during active processes (downloads, conversions).
 *
 * Handles:
 * - Browser back/forward (popstate)
 * - Same-origin link clicks
 * - Paste prevention
 * - Browser beforeunload prompt
 */
export function useNavigationGuard({
    isActive,
    onConfirmLeave,
    pasteBlockMessage = 'Please wait for the current process to finish.',
    useBeforeUnload = false,
    beforeUnloadMessage = 'A process is still running. Are you sure you want to leave?',
    popstateBlockMessage,
}: UseNavigationGuardOptions): void {
    const hasPushedGuardStateRef = useRef(false);

    // Block browser back/forward navigation
    useEffect(() => {
        if (!isActive) return;

        if (!hasPushedGuardStateRef.current) {
            window.history.pushState({ ...(window.history.state || {}), downloadInProgress: true }, '');
            hasPushedGuardStateRef.current = true;
        }

        const handlePopState = () => {
            if (isActive) {
                window.history.pushState({ downloadInProgress: true }, '');
                if (popstateBlockMessage) {
                    toast.warning(popstateBlockMessage);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (window.history.state?.downloadInProgress) {
                const nextState = { ...(window.history.state || {}) } as Record<string, unknown>;
                delete nextState.downloadInProgress;
                window.history.replaceState(nextState, '');
            }
            hasPushedGuardStateRef.current = false;
        };
    }, [isActive, popstateBlockMessage]);

    // Intercept same-origin link clicks
    useEffect(() => {
        if (!isActive || !onConfirmLeave) return;

        const handleClick = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');

            if (link && link.href && !link.href.startsWith('blob:') && !link.download) {
                const isSameOrigin = link.href.startsWith(window.location.origin);

                if (isSameOrigin) {
                    e.preventDefault();
                    e.stopPropagation();

                    const shouldNavigate = await onConfirmLeave();
                    if (shouldNavigate) {
                        window.location.href = link.href;
                    }
                }
            }
        };

        document.addEventListener('click', handleClick, true);
        return () => document.removeEventListener('click', handleClick, true);
    }, [isActive, onConfirmLeave]);

    // Prevent paste during active process
    useEffect(() => {
        if (!isActive) return;

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            toast.warning(pasteBlockMessage);
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isActive, pasteBlockMessage]);

    // Browser beforeunload prompt
    useEffect(() => {
        if (!isActive || !useBeforeUnload) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = beforeUnloadMessage;
            return e.returnValue;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isActive, useBeforeUnload, beforeUnloadMessage]);
}
