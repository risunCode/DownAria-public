'use client';

import Link from 'next/link';
import { AlertTriangle, ExternalLink, History, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getDownloaderMaintenanceConfig } from '@/modules/downloader/services';

interface MaintenanceNoticeProps {
  submittedUrl?: string | null;
}

export function MaintenanceNotice({ submittedUrl }: MaintenanceNoticeProps) {
  const tMaintenance = useTranslations('maintenance');
  const tNav = useTranslations('nav');
  const maintenance = getDownloaderMaintenanceConfig();

  return (
    <div className="glass-card p-4 sm:p-5 border border-amber-500/30 space-y-3" data-feature-status={maintenance.status}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-amber-400">{tMaintenance('title')}</h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mt-1">
            {tMaintenance('defaultMessage')}
          </p>
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] leading-relaxed mt-2">
            {tMaintenance('alternateSiteMessage')}
          </p>
          {submittedUrl ? (
            <p className="text-[11px] text-[var(--text-muted)] mt-2 break-all">{submittedUrl}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{tNav('settings')}</span>
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          <span>{tNav('history')}</span>
        </Link>
        <a
          href={maintenance.alternateSiteUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{tMaintenance('alternateSiteButton')}</span>
        </a>
      </div>
    </div>
  );
}
