'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function OfflinePage() {
  const t = useTranslations('offlinePage');
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="surface-card glass-card p-6 sm:p-8 border border-[var(--border-color)]">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <img src="/icon.png" alt="DownAria" className="w-10 h-10 rounded-xl shadow-lg" />
              <div>
                <p className="text-lg font-bold gradient-text">DownAria</p>
                <p className="text-xs text-[var(--text-muted)]">{t('badge')}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide border border-[var(--border-color)] text-[var(--text-muted)]">
              {t('status')}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-semibold">{t('title')}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('description')}
            </p>
          </div>

          <div className="mt-6 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="h-40 sm:h-48 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center">
              <div className="w-0 h-0 border-t-[18px] border-t-transparent border-b-[18px] border-b-transparent border-l-[28px] border-l-[var(--accent-primary)]" />
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {t('previewHint')}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/"
              className="surface-accent text-white px-4 py-2 rounded-[6px] text-sm font-semibold"
            >
              {t('actions.tryAgain')}
            </Link>
            <Link
              href="/history"
              className="surface-card text-[var(--text-primary)] px-4 py-2 rounded-[6px] text-sm font-semibold border border-[var(--border-color)]"
            >
              {t('actions.openHistory')}
            </Link>
            <Link
              href="/docs"
              className="bg-transparent text-[var(--text-secondary)] px-4 py-2 rounded-[6px] text-sm font-semibold border border-[var(--border-color)]"
            >
              {t('actions.openDocs')}
            </Link>
          </div>

          <div className="mt-6 text-xs text-[var(--text-muted)]">
            {t('tip')}
          </div>
        </div>
      </div>
    </div>
  );
}
