'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Radio, TrendingUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

export const POLLING_INTERVAL_MS = 20_000;
const FRESHNESS_TICK_MS = 5_000;

type PublicStatsPayload = {
  todayVisits: number;
  totalVisits: number;
  totalExtractions: number;
  totalDownloads: number;
};

type StatsEnvelope = {
  success?: boolean;
  data?: unknown;
};

const FALLBACK_STATS: PublicStatsPayload = {
  todayVisits: 0,
  totalVisits: 0,
  totalExtractions: 0,
  totalDownloads: 0,
};

function isPublicStatsPayload(value: unknown): value is PublicStatsPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return [
    candidate.todayVisits,
    candidate.totalVisits,
    candidate.totalExtractions,
    candidate.totalDownloads,
  ].every((entry) => typeof entry === 'number' && Number.isFinite(entry) && entry >= 0);
}

function parsePublicStatsPayload(payload: unknown): PublicStatsPayload | null {
  if (isPublicStatsPayload(payload)) return payload;

  if (!payload || typeof payload !== 'object') return null;
  const envelope = payload as StatsEnvelope;
  if (envelope.success === true && isPublicStatsPayload(envelope.data)) {
    return envelope.data;
  }

  return null;
}

async function fetchPublicStats(): Promise<PublicStatsPayload> {
  const response = await fetch('/api/stats/public', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`stats request failed with ${response.status}`);
  }

  const payload = await response.json();
  const parsed = parsePublicStatsPayload(payload);
  if (!parsed) {
    throw new Error('invalid stats payload');
  }

  return parsed;
}

function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(locale).replace(/,/g, ' ');
}

function getFreshnessText(
  lastSuccessAt: number | null,
  now: number,
  lastRefreshFailed: boolean,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (!lastSuccessAt) {
    return lastRefreshFailed ? t('freshness.waitingRetry') : t('freshness.waiting');
  }

  const ageSeconds = Math.max(0, Math.floor((now - lastSuccessAt) / 1000));
  const base = ageSeconds < 5 ? t('freshness.updatedJustNow') : t('freshness.updatedAgo', { seconds: ageSeconds });

  if (lastRefreshFailed) {
    return t('freshness.updatedAgoWithFailed', { base });
  }

  return base;
}

export function PublicStats() {
  const t = useTranslations('publicStats');
  const locale = useLocale();
  const [stats, setStats] = useState<PublicStatsPayload>(FALLBACK_STATS);
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [lastRefreshFailed, setLastRefreshFailed] = useState(false);
  const [clockTick, setClockTick] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const nextStats = await fetchPublicStats();
        if (!isMounted) return;
        setStats(nextStats);
        setLastSuccessAt(Date.now());
        setLastRefreshFailed(false);
      } catch {
        if (!isMounted) return;
        setLastRefreshFailed(true);
      }
    };

    void loadStats();
    const interval = setInterval(() => {
      void loadStats();
    }, POLLING_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let clock: ReturnType<typeof setInterval> | null = null;

    const startClock = () => {
      if (clock) return;
      clock = setInterval(() => {
        setClockTick(Date.now());
      }, FRESHNESS_TICK_MS);
    };

    const stopClock = () => {
      if (!clock) return;
      clearInterval(clock);
      clock = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setClockTick(Date.now());
        startClock();
        return;
      }
      stopClock();
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopClock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const freshnessText = useMemo(
    () => getFreshnessText(lastSuccessAt, clockTick, lastRefreshFailed, t),
    [lastSuccessAt, clockTick, lastRefreshFailed, t],
  );
  const statCards = useMemo<Array<{
    icon: typeof Eye;
    label: string;
    value?: number | string;
    detailLines?: string[];
    color: string;
  }>>(() => [
    {
      icon: Eye,
      label: t('cards.visitors.label'),
      detailLines: [
        t('cards.visitors.today', { value: formatNumber(stats.todayVisits, locale) }),
        t('cards.visitors.total', { value: formatNumber(stats.totalVisits, locale) }),
      ],
      color: 'text-sky-500',
    },
    {
      icon: TrendingUp,
      label: t('cards.extractions.label'),
      value: stats.totalExtractions,
      color: 'text-emerald-500',
    },
    {
      icon: Download,
      label: t('cards.downloads.label'),
      value: stats.totalDownloads,
      color: 'text-indigo-500',
    },
  ], [stats, t, locale]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-1">
        <p className="text-[11px] text-[var(--text-muted)] break-words [overflow-wrap:anywhere]">{freshnessText}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] min-w-0">
          <Radio className="w-3 h-3 shrink-0" />
          <span>{t('pollingEvery', { seconds: POLLING_INTERVAL_MS / 1000 })}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg p-2 sm:p-3 bg-[var(--bg-card)] border border-[var(--border-color)]">
            <div className="space-y-1.5">
              <card.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${card.color}`} />
              <div>
                {card.detailLines ? (
                  <>
                    <p className={`text-xs sm:text-sm font-semibold ${card.color}`}>{card.label}</p>
                    <p className="text-[9px] sm:text-xs text-[var(--text-muted)] leading-tight break-words">{card.detailLines[0]}</p>
                    <p className="text-[9px] sm:text-xs text-[var(--text-muted)] leading-tight break-words">{card.detailLines[1]}</p>
                  </>
                ) : (
                  <>
                      <p className={`text-base sm:text-2xl font-bold ${card.color}`}>
                        {typeof card.value === 'number' ? formatNumber(card.value, locale) : card.value}
                      </p>
                    <p className="text-[9px] sm:text-xs text-[var(--text-muted)] leading-tight break-words">{card.label}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
