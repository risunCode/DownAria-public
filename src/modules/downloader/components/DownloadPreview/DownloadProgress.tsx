'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/shared/utils/cn';
import { formatBytes } from '@/modules/downloader/utils/preview-helpers';

interface DownloadProgressProps {
  progress: {
    percent: number;
    loaded: number;
    total: number;
    speed: number;
    message?: string;
    status?: 'idle' | 'downloading' | 'converting' | 'done' | 'error';
    startTime?: number;
  };
  className?: string;
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
  if (progress.message) return progress.message;
  return `${progress.percent.toFixed(0)}%`;
}

function buildCompactProgressLabel(progress: {
  percent: number;
  status?: 'idle' | 'downloading' | 'converting' | 'done' | 'error';
  message?: string;
}): string {
  if (progress.status === 'done') {
    return progress.message || 'Done!';
  }
  if (progress.status === 'error') {
    return progress.message || 'Download failed';
  }
  if (progress.status === 'idle') {
    return progress.message || 'Download';
  }
  const safePercent = Math.max(0, Math.min(100, Math.round(progress.percent || 0)));
  return safePercent > 0 ? `Downloading... ${safePercent}%` : 'Downloading...';
}

export const DownloadProgress = memo(function DownloadProgress({ progress, className }: DownloadProgressProps) {
  const { percent, loaded, total, speed, message, status, startTime } = progress;
  const [elapsedTime, setElapsedTime] = useState(0);

  const isProcessingServer = useMemo(() => {
    const text = (message || '').toLowerCase();
    const processingHint = text.includes('processing on server') || text.includes('preparing') || text.includes('waiting');
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
      setElapsedTime((prev) => (prev === elapsed ? prev : elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, status]);

  const progressText = useMemo(
    () => buildProgressText({ percent, loaded, total, speed, message, status }),
    [percent, loaded, total, speed, message, status]
  );

  const elapsedText = elapsedTime > 0 ? ` • ${formatElapsedTime(elapsedTime)} elapsed` : '';

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden relative">
        {isProcessingServer ? (
          <div className="absolute inset-0 w-full h-full">
            <div className="absolute inset-0 bg-[var(--accent-primary)]/10" />
            <motion.div 
              className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--accent-primary)]/40 to-transparent"
              animate={{ left: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <div
            className={cn(
              "h-full transition-all duration-300 rounded-full",
              status === 'error' ? "bg-red-500" : "bg-[var(--accent-primary)]"
            )}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        )}
      </div>
      <p className={cn(
        "text-[11px] font-mono flex justify-between items-center",
        status === 'error' ? "text-red-400" : "text-[var(--text-muted)]"
      )}>
        <span>{progressText}</span>
        <span className="opacity-70">{elapsedText}</span>
      </p>
    </div>
  );
});

export function getProgressText(progress: {
  percent: number;
  loaded: number;
  total: number;
  speed: number;
  message?: string;
  status?: 'idle' | 'downloading' | 'converting' | 'done' | 'error';
}): string {
  return buildProgressText(progress);
}

export function getCompactProgressLabel(progress: {
  percent: number;
  status?: 'idle' | 'downloading' | 'converting' | 'done' | 'error';
  message?: string;
}): string {
  return buildCompactProgressLabel(progress);
}
