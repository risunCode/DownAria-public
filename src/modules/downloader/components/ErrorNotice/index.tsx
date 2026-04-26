'use client';

import Link from 'next/link';
import { AlertTriangle, History, RefreshCw, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

type ErrorNoticeProps = {
  code?: string | null;
  message: string;
  submittedUrl?: string | null;
};

function resolveErrorPresentation(code: string | null | undefined, t: (key: string) => string) {
  switch ((code || '').trim()) {
    case 'instagram_auth_required':
      return {
        title: t('presentations.authenticationRequiredTitle'),
        description: t('presentations.instagramAuthRequiredDescription'),
        emphasizeCookies: true,
      };
    case 'instagram_media_not_found':
      return {
        title: t('presentations.mediaUnavailableTitle'),
        description: t('presentations.instagramMediaNotFoundDescription'),
        emphasizeCookies: true,
      };
    case 'instagram_rate_limited':
      return {
        title: t('presentations.temporarilyRateLimitedTitle'),
        description: t('presentations.instagramRateLimitedDescription'),
        emphasizeCookies: false,
      };
    case 'auth_required':
    case 'age_restricted':
      return {
        title: t('presentations.authenticationRequiredTitle'),
        description: t('presentations.authRequiredDescription'),
        emphasizeCookies: true,
      };
    default:
      return {
        title: t('presentations.requestFailedTitle'),
        description: t('presentations.requestFailedDescription'),
        emphasizeCookies: false,
      };
  }
}

export function ErrorNotice({ code, message, submittedUrl }: ErrorNoticeProps) {
  const t = useTranslations('errors.notice');
  const tCommon = useTranslations('common');
  const presentation = resolveErrorPresentation(code, t);

  return (
    <div className="glass-card p-4 sm:p-5 border border-rose-500/30 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-rose-500/10 p-2 text-rose-400">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-rose-300">{presentation.title}</h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mt-1">
            {presentation.description}
          </p>
          <div className="mt-2 space-y-1 text-[11px] sm:text-xs text-[var(--text-muted)]">
            {code ? <p><span className="text-[var(--text-secondary)]">{t('codeLabel')}:</span> {code}</p> : null}
            <p className="break-words"><span className="text-[var(--text-secondary)]">{t('detailsLabel')}:</span> {message}</p>
            {submittedUrl ? <p className="break-all">{submittedUrl}</p> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={presentation.emphasizeCookies ? '/settings?tab=cookies' : '/settings'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{presentation.emphasizeCookies ? t('openCookies') : t('openSettings')}</span>
        </Link>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          <span>{t('history')}</span>
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{tCommon('retry')}</span>
        </button>
      </div>
    </div>
  );
}
