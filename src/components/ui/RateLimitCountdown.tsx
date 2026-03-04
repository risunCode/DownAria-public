'use client';

import { CheckCircle2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RateLimitCountdownProps {
    isReady: boolean;
    formatted: string;
}

export function RateLimitCountdown({ isReady, formatted }: RateLimitCountdownProps) {
    const t = useTranslations('rateLimit');

    if (isReady) {
        return (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div className="text-center">
                    <p className="text-xs text-emerald-300">{t('countdown.retryStatus')}</p>
                    <p className="text-lg font-semibold text-emerald-400">{t('countdown.readyToRetry')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <Clock className="h-5 w-5 text-amber-400" />
            <div className="text-center">
                <p className="text-xs text-[var(--text-muted)]">{t('countdown.resetsIn')}</p>
                <p className="text-2xl font-mono font-bold tabular-nums text-amber-400">{formatted}</p>
            </div>
        </div>
    );
}
