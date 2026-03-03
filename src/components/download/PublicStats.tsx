'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Radio, TrendingUp } from 'lucide-react';

const POLLING_INTERVAL_MS = 20_000;
const FRESHNESS_TICK_MS = 5_000;

const PLACEHOLDER_STATS = {
  todayVisits: 999_999_999,
  totalVisits: 999_999_999,
  totalExtractions: 999_999_999,
  totalDownloads: 999_999_999,
};

function formatNumber(value: number): string {
  return value.toLocaleString('en-US').replace(/,/g, ' ');
}

function getFreshnessText(lastUpdatedAt: number | null, now: number): string {
  if (!lastUpdatedAt) return 'Waiting for data';
  const ageSeconds = Math.max(0, Math.floor((now - lastUpdatedAt) / 1000));
  if (ageSeconds < 5) return 'Updated just now';
  return `Updated ${ageSeconds}s ago`;
}

export function PublicStats() {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState<number>(0);

  useEffect(() => {
    setLastUpdatedAt(Date.now());
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

  const freshnessText = useMemo(() => getFreshnessText(lastUpdatedAt, clockTick), [lastUpdatedAt, clockTick]);
  const statCards = useMemo<Array<{
    icon: typeof Eye;
    label: string;
    value?: number | string;
    detailLines?: string[];
    color: string;
  }>>(() => [
    {
      icon: Eye,
      label: 'Visitors',
      detailLines: [
        `Today: ${formatNumber(PLACEHOLDER_STATS.todayVisits)}`,
        `Total: ${formatNumber(PLACEHOLDER_STATS.totalVisits)}`,
      ],
      color: 'text-sky-500',
    },
    {
      icon: TrendingUp,
      label: 'Extractions',
      value: PLACEHOLDER_STATS.totalExtractions,
      color: 'text-emerald-500',
    },
    {
      icon: Download,
      label: 'Downloads',
      value: PLACEHOLDER_STATS.totalDownloads,
      color: 'text-indigo-500',
    },
  ], []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-[var(--text-muted)]">{freshnessText}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <Radio className="w-3 h-3" />
          <span>Polling every {POLLING_INTERVAL_MS / 1000}s</span>
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
                    <p className="text-[9px] sm:text-xs text-[var(--text-muted)]">{card.detailLines[0]}</p>
                    <p className="text-[9px] sm:text-xs text-[var(--text-muted)]">{card.detailLines[1]}</p>
                  </>
                ) : (
                  <>
                    <p className={`text-base sm:text-2xl font-bold ${card.color}`}>
                      {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
                    </p>
                    <p className="text-[9px] sm:text-xs text-[var(--text-muted)]">{card.label}</p>
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
