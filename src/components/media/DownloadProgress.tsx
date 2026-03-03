'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils/format';

export interface DownloadProgressData {
    percent: number;
    loaded: number;
    total: number;
    speed: number;
    eta?: number;
    message?: string;
    status?: 'idle' | 'downloading' | 'converting' | 'done' | 'error';
    startTime?: number;
}

function formatElapsedTime(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) {
        return '0:00';
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function buildProgressText(progress: {
    percent: number;
    loaded: number;
    total: number;
    speed: number;
    message?: string;
    status?: 'idle' | 'downloading' | 'converting' | 'done' | 'error';
}): string {
    if (progress.status === 'done') {
        return progress.message || 'Download complete!';
    }

    if (progress.status === 'error') {
        return progress.message || 'Download failed';
    }

    if (progress.status === 'idle') {
        return progress.message || 'Download cancelled';
    }

    if (progress.loaded > 0) {
        const percentText = progress.total > 0 ? `${progress.percent.toFixed(0)}% • ` : '';
        const sizeText = progress.total > 0
            ? `${formatBytes(progress.loaded)}/${formatBytes(progress.total)}`
            : formatBytes(progress.loaded);
        const speedText = progress.speed > 0 ? ` • ${formatBytes(progress.speed)}/s` : '';
        return `${percentText}${sizeText}${speedText}`;
    }

    if (progress.speed > 0) {
        return `${progress.percent.toFixed(0)}% • ${formatBytes(progress.loaded)}/${formatBytes(progress.total)} • ${formatBytes(progress.speed)}/s`;
    }

    if (progress.message) {
        return progress.message;
    }

    return `${progress.percent.toFixed(0)}%`;
}

interface DownloadProgressProps {
    progress: DownloadProgressData;
    className?: string;
}

export const DownloadProgress = memo(function DownloadProgress({ progress, className }: DownloadProgressProps) {
    const { percent, loaded, total, speed, message, status, startTime } = progress;
    const [elapsedTime, setElapsedTime] = useState(0);

    const isProcessingServer = useMemo(() => {
        const text = (message || '').toLowerCase();
        const processingHint = text.includes('processing on server') || text.includes('preparing');
        const mergingState = status === 'converting';
        return loaded <= 0 && (processingHint || mergingState);
    }, [loaded, message, status]);

    useEffect(() => {
        if (!startTime || status === 'idle' || status === 'done' || status === 'error') {
            setElapsedTime(0);
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Math.max(0, Date.now() - startTime);
            setElapsedTime((previous) => (previous === elapsed ? previous : elapsed));
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, status]);

    const progressText = useMemo(
        () => buildProgressText({ percent, loaded, total, speed, message, status }),
        [percent, loaded, total, speed, message, status],
    );

    const elapsedText = elapsedTime > 0 ? ` • ${formatElapsedTime(elapsedTime)} elapsed` : '';

    return (
        <div className={cn('space-y-1', className)}>
            <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                {isProcessingServer ? (
                    <div className="relative h-full w-full">
                        <div className="absolute inset-0 bg-[var(--accent-primary)]/15" />
                        <div className="downaria-processing-dot absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary)]" />
                    </div>
                ) : (
                    <div
                        className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
                {progressText}{elapsedText}
            </p>
            <style jsx>{`
                @keyframes downaria-processing-scan {
                    0% { left: 0%; }
                    50% { left: calc(100% - 0.5rem); }
                    100% { left: 0%; }
                }

                .downaria-processing-dot {
                    animation: downaria-processing-scan 1.25s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
});

export function getProgressText(progress: DownloadProgressData): string {
    return buildProgressText(progress);
}

export default DownloadProgress;
