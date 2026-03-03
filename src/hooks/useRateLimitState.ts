'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseRateLimitStateInput {
    isOpen: boolean;
    resetAt: number;
}

export interface RateLimitState {
    secondsLeft: number;
    isReady: boolean;
    formatted: string;
}

function formatRateLimitTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useRateLimitState({ isOpen, resetAt }: UseRateLimitStateInput): RateLimitState {
    const [secondsLeft, setSecondsLeft] = useState(0);

    const recalculate = useCallback(() => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, resetAt - now);
        setSecondsLeft(remaining);
        return remaining;
    }, [resetAt]);

    useEffect(() => {
        if (!isOpen || !resetAt) return;
        recalculate();

        const timer = setInterval(() => {
            const remaining = recalculate();
            if (remaining <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, resetAt, recalculate]);

    return useMemo(() => ({
        secondsLeft,
        isReady: secondsLeft <= 0,
        formatted: formatRateLimitTime(secondsLeft),
    }), [secondsLeft]);
}
