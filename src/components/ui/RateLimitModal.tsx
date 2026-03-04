'use client';

import { Shield, Zap } from 'lucide-react';
import { useRateLimitState } from '@/hooks/useRateLimitState';
import { Modal } from './Modal';
import { RateLimitCountdown } from './RateLimitCountdown';
import { useTranslations } from 'next-intl';

interface RateLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    resetAt: number;
    limit?: number;
    window?: string;
    message?: string;
}

export function RateLimitModal({
    isOpen,
    onClose,
    resetAt,
    limit,
    window: windowStr,
    message,
}: RateLimitModalProps) {
    const t = useTranslations('rateLimit');
    const rateLimitState = useRateLimitState({ isOpen, resetAt });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('title')}
            size="md"
            showTitle={false}
            bodyClassName="space-y-5 p-6"
        >
            <div className="text-center">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                    <Shield className="h-7 w-7 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('reachedTitle')}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {message || (typeof limit === 'number' && windowStr
                        ? t('limitMessage', { limit, window: windowStr })
                        : t('tooManyRequests'))}
                </p>
            </div>

            <RateLimitCountdown
                isReady={rateLimitState.isReady}
                formatted={rateLimitState.formatted}
            />

            <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)]">{t('currentLimit')}</p>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <Zap className="h-3 w-3 shrink-0 text-blue-400" />
                        <span>
                            {t('guestLimit')}: <strong className="text-blue-400">{typeof limit === 'number' && windowStr ? t('guestLimitValue', { limit, window: windowStr }) : t('configuredByServer')}</strong>
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex">
                <button
                    onClick={onClose}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-hover)]"
                >
                    {rateLimitState.isReady ? t('retryNow') : t('wait')}
                </button>
            </div>
        </Modal>
    );
}
