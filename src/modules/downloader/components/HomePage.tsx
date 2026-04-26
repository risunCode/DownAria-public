'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Copy, MessageCircle } from 'lucide-react';

import { SidebarLayout } from '@/shared/layout/Sidebar';
import { BoltIcon, LayersIcon, LockIcon, MagicIcon, FacebookIcon, InstagramIcon, XTwitterIcon } from '@/shared/ui/Icons';
import {
  createIdleDownloaderRequestState,
  createMaintenanceDownloaderRequestState,
  type DownloaderSubmission,
  type DownloaderRequestState,
} from '@/modules/downloader';
import { type PlatformId, PLATFORMS } from '@/modules/media';
import { DownloadForm } from '@/modules/downloader/components/DownloadForm';
import { ErrorNotice } from '@/modules/downloader/components/ErrorNotice';
import { DownloadPreview } from '@/modules/downloader/components/DownloadPreview';
import { DownloadPreviewSkeleton } from '@/modules/downloader/components/DownloadPreview/DownloadPreviewSkeleton';
import { MaintenanceNotice } from '@/modules/downloader/components/MaintenanceNotice';
import { HistoryList } from '@/modules/history/components/HistoryList';
import { getDownloaderMaintenanceConfig, persistExtractHistory, resolveDownloaderSubmission } from '@/modules/downloader/services';
import { getScraperCache, setScraperCache } from '@/infra/storage';
import { type BackendExtractData, type BackendResponse, isBackendExtractData, isBackendResponse } from '@/infra/api/types';

const REVEAL_CONTAINER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const REVEAL_ITEM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

type StatsBucket = 'visitors' | 'extractions' | 'downloads';
type StatsCardTitle = 'visitorsToday' | 'todayExtraction' | 'downloadsToday';

interface StatsPayload {
  visitors: { today: number; total: number };
  extractions: { today: number; total: number };
  downloads: { today: number; total: number };
  updated_at: string;
}

interface StatsEnvelope {
  success: boolean;
  data?: StatsPayload;
}

function formatNumber(value?: number): string {
  if (!value) return '0';
  return value.toLocaleString();
}

function renderStatsCard(
  title: StatsCardTitle,
  state:
    | { status: 'loading' | 'idle' }
    | { status: 'ready'; data: StatsPayload }
    | { status: 'error' },
  bucket: StatsBucket,
  labels: {
    visitorsToday: string;
    todayExtraction: string;
    downloadsToday: string;
    visitorsCompact: string;
    extractsCompact: string;
    downloadsCompact: string;
    total: string;
    serviceOffline: string;
    lastUpdated: string;
  }
) {
  const fullTitle = labels[title];
  const compactTitle =
    title === 'visitorsToday' ? labels.visitorsCompact : title === 'todayExtraction' ? labels.extractsCompact : labels.downloadsCompact;

  if (state.status === 'ready') {
    const values = state.data[bucket];
    return (
      <div className="glass-card border border-[var(--border-color)] rounded-[1.25rem] px-3 py-2 sm:rounded-full sm:px-5 sm:py-3">
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.2em] text-[var(--text-muted)] leading-tight">
          <span className="sm:hidden">{compactTitle}</span>
          <span className="hidden sm:inline">{fullTitle}</span>
        </div>
        <div className="mt-1 text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-tight">
          {formatNumber(values.today)}
        </div>
        <div className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">{labels.total} {formatNumber(values.total)}</div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="glass-card border border-[var(--border-color)] rounded-[1.25rem] px-3 py-2 sm:rounded-full sm:px-5 sm:py-3">
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.2em] text-[var(--text-muted)] leading-tight">
          <span className="sm:hidden">{compactTitle}</span>
          <span className="hidden sm:inline">{fullTitle}</span>
        </div>
        <div className="mt-2 h-4 w-14 sm:w-24 bg-[var(--bg-tertiary)]/70 rounded" />
        <div className="mt-2 h-3 w-12 sm:w-20 bg-[var(--bg-tertiary)]/60 rounded" />
      </div>
    );
  }

  return (
    <div className="glass-card border border-[var(--border-color)] rounded-[1.25rem] px-3 py-2 sm:rounded-full sm:px-5 sm:py-3">
      <div className="text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.2em] text-[var(--text-muted)] leading-tight">
        <span className="sm:hidden">{compactTitle}</span>
        <span className="hidden sm:inline">{fullTitle}</span>
      </div>
      <div className="mt-1 text-xs sm:text-sm text-amber-400 leading-tight">{labels.serviceOffline}</div>
      <div className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-tight">{labels.lastUpdated}: —</div>
    </div>
  );
}

function AnimatedTitle() {
  const [index, setIndex] = useState(0);
  const t = useTranslations('home');
  const titleVariants = t.raw('platforms');
  const variants = [
    titleVariants.socialMedia,
    titleVariants.facebook,
    titleVariants.instagram,
    titleVariants.twitter,
    titleVariants.pixiv,
    titleVariants.youtube,
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % variants.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [variants.length]);

  return (
    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 h-8 sm:h-10">
      <span className="text-[var(--text-primary)]">{t('titlePrefix')} </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="gradient-text inline-block"
        >
          {variants[index]}
        </motion.span>
      </AnimatePresence>
      <span className="text-[var(--text-primary)]"> {t('titleSuffix')}</span>
    </h1>
  );
}

export function HomePage() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const tHistory = useTranslations('historyList');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [platform, setPlatform] = useState<PlatformId>('facebook');
  const [requestState, setRequestState] = useState<DownloaderRequestState>(createIdleDownloaderRequestState());
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BackendResponse<BackendExtractData> | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestErrorCode, setRequestErrorCode] = useState<string | null>(null);
  const [prefillUrl, setPrefillUrl] = useState('');
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [shareNotice, setShareNotice] = useState('');
  const [shareBaseUrl, setShareBaseUrl] = useState<string | null>(null);
  const [statsState, setStatsState] = useState<
    | { status: 'loading' | 'idle' }
    | { status: 'ready'; data: StatsPayload }
    | { status: 'error' }
  >({ status: 'idle' });
  const maintenance = getDownloaderMaintenanceConfig();
  const resultRef = useRef<HTMLDivElement | null>(null);
  const lastHandledUrlRef = useRef<string | null>(null);
  const skipAutoScrollRef = useRef(false);

  const sharePlatforms = [
    { id: 'share-facebook', label: 'Facebook', icon: <FacebookIcon className="w-4 h-4" /> },
    { id: 'share-instagram', label: 'Instagram', icon: <InstagramIcon className="w-4 h-4" /> },
    { id: 'share-twitter', label: 'Twitter', icon: <XTwitterIcon className="w-4 h-4" /> },
    { id: 'share-whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
  ];
  const statsLabels = {
    visitorsToday: t('stats.visitorsToday'),
    todayExtraction: t('stats.todayExtraction'),
    downloadsToday: t('stats.downloadsToday'),
    visitorsCompact: t('stats.visitorsCompact'),
    extractsCompact: t('stats.extractsCompact'),
    downloadsCompact: t('stats.downloadsCompact'),
    total: t('stats.total'),
    serviceOffline: t('stats.serviceOffline'),
    lastUpdated: t('stats.lastUpdated'),
  };

  const buildShareUrl = (ref: string) => {
    if (!shareBaseUrl) {
      return `/?ref=${ref}`;
    }
    return `${shareBaseUrl}/?ref=${ref}`;
  };

  const handleShare = async (ref: string) => {
    const shareUrl = buildShareUrl(ref);
    setShareNotice('');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DownAria',
          text: 'DownAria — social media downloader',
          url: shareUrl,
        });
        return;
      } catch {
        // fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareNotice(t('share.copiedToClipboard'));
    } catch {
      setShareNotice(shareUrl);
    }
  };

  useEffect(() => {
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
    }
  }, [result, requestError]);

  const handleSubmit = useCallback(async ({ url, platform: submissionPlatform }: DownloaderSubmission) => {
    setPlatform(submissionPlatform);
    setRequestState(createIdleDownloaderRequestState());
    setIsLoading(true);
    setResult(null);
    setRequestError(null);
    setRequestErrorCode(null);

    try {
      // Check cache first
      const cached = await getScraperCache(url);
      if (cached && isBackendResponse(cached) && isBackendExtractData(cached.data)) {
        const cachedPayload = cached as BackendResponse<BackendExtractData>;
        setResult(cachedPayload);
        try {
          await persistExtractHistory(cachedPayload);
          setHistoryRefreshTrigger((prev) => prev + 1);
        } catch {}
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('DownAria received a non-JSON response from the backend bridge.');
      }

      const payload: unknown = await response.json();
      if (!isBackendResponse(payload)) {
        throw new Error('DownAria received an invalid response from the backend bridge.');
      }
      if (!response.ok || !payload.success || !isBackendExtractData(payload.data)) {
        const message = payload.error?.message || 'Extraction failed.';
        const code = payload.error?.code?.trim();
        throw new Error(code ? `${code}: ${message}` : message);
      }

      setResult(payload as BackendResponse<BackendExtractData>);
      try {
        await persistExtractHistory(payload as BackendResponse<BackendExtractData>);
        setHistoryRefreshTrigger((prev) => prev + 1);
      } catch {}
      // Save to cache (default 7 days)
      await setScraperCache(url, submissionPlatform, payload);
    } catch (error) {
      const message =
        error instanceof TypeError
          ? 'Network error. Check your connection and try again.'
          : error instanceof Error
          ? error.message
          : 'Extraction failed.';
      const separatorIndex = message.indexOf(': ');
      const extractedCode = separatorIndex > 0 ? message.slice(0, separatorIndex).trim() : null;
      const extractedMessage = separatorIndex > 0 ? message.slice(separatorIndex + 2).trim() : message;
      setRequestErrorCode(extractedCode);
      setRequestError(extractedMessage);
      if (maintenance.status !== 'ready') {
        setRequestState(createMaintenanceDownloaderRequestState({ url, platform: submissionPlatform }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [maintenance.status]);

  useEffect(() => {
    const rawUrl = searchParams.get('url');
    if (!rawUrl) return;

    if (rawUrl === lastHandledUrlRef.current) {
      return;
    }

    const platformParam = searchParams.get('platform')?.toLowerCase();
    const fallbackPlatform = PLATFORMS.find((item) => item.id === platformParam)?.id || platform;
    const submission = resolveDownloaderSubmission(rawUrl, fallbackPlatform);
    if (!submission.ok) {
      return;
    }

    lastHandledUrlRef.current = rawUrl;
    skipAutoScrollRef.current = true;
    setPrefillUrl(submission.url);
    handleSubmit({ url: submission.url, platform: submission.platform });
    router.replace('/', { scroll: false });
  }, [handleSubmit, platform, router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const loadStats = async (attempt = 0) => {
      setStatsState({ status: 'loading' });
      try {
        const response = await fetch('/api/stats', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('stats unavailable');
        }
        const payload: StatsEnvelope = await response.json();
        if (!payload?.success || !payload.data) {
          throw new Error('stats invalid');
        }
        if (!cancelled) {
          setStatsState({ status: 'ready', data: payload.data });
        }
      } catch {
        if (attempt < 1) {
          retryTimer = setTimeout(() => {
            if (!cancelled) {
              loadStats(attempt + 1);
            }
          }, 2000);
          return;
        }
        if (!cancelled) {
          setStatsState({ status: 'error' });
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'visit' }),
    }).catch(() => undefined);
  }, []);

  return (
    <SidebarLayout>
      <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-5xl mx-auto space-y-4 sm:space-y-6"
          variants={REVEAL_CONTAINER}
          initial="hidden"
          animate="show"
        >
          <motion.div className="text-center py-2 sm:py-4" variants={REVEAL_ITEM}>
            <AnimatedTitle />
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-3">
              {t('subtitle')}
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-[10px] sm:text-xs">
              <span className="px-2 py-1 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center gap-1 max-w-full min-w-0">
                <MagicIcon className="w-3 h-3 text-purple-400 shrink-0" /> <span className="break-words [overflow-wrap:anywhere]">{t('badges.noWatermark')}</span>
              </span>
              <span className="px-2 py-1 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center gap-1 max-w-full min-w-0">
                <BoltIcon className="w-3 h-3 text-yellow-400 shrink-0" /> <span className="break-words [overflow-wrap:anywhere]">{t('badges.fastFree')}</span>
              </span>
              <span className="px-2 py-1 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center gap-1 max-w-full min-w-0">
                <LayersIcon className="w-3 h-3 text-blue-400 shrink-0" /> <span className="break-words [overflow-wrap:anywhere]">{t('badges.multiQuality')}</span>
              </span>
              <span className="px-2 py-1 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center gap-1 max-w-full min-w-0">
                <LockIcon className="w-3 h-3 text-green-400 shrink-0" /> <span className="break-words [overflow-wrap:anywhere]">{t('badges.noLogin')}</span>
              </span>
            </div>
          </motion.div>

          <motion.div variants={REVEAL_ITEM}>
            <DownloadForm
              platform={platform}
              onPlatformChange={setPlatform}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              initialUrl={prefillUrl}
            />
          </motion.div>

          {(isLoading || requestError || result) ? (
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <div className="h-px flex-1 bg-[var(--border-color)]/60" />
              <span className="uppercase tracking-[0.2em]">{t('result')}</span>
              <div className="h-px flex-1 bg-[var(--border-color)]/60" />
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="preview-loading"
                variants={REVEAL_ITEM}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <DownloadPreviewSkeleton />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {requestError ? (
            <div ref={resultRef} className="space-y-4">
              <ErrorNotice code={requestErrorCode} message={requestError} />
            </div>
          ) : null}

          {result ? (
            <div ref={resultRef} className="space-y-4">
              <DownloadPreview key={result.data?.url} result={result} />
            </div>
          ) : null}

          {requestState.status === 'maintenance' ? (
            <div>
              <MaintenanceNotice submittedUrl={requestState.submittedUrl} />
            </div>
          ) : null}

          <div className="mt-8">
            <Suspense fallback={null}>
              <HistoryList
                refreshTrigger={historyRefreshTrigger}
                compact
                maxItems={2}
                onTotalCountChange={setHistoryCount}
                compactHeaderRight={
                  historyCount > 0 ? (
                    <a
                      href="/history"
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                    >
                      {tHistory('viewAllHistory', { count: historyCount })}
                    </a>
                  ) : null
                }
              />
            </Suspense>
          </div>

          <motion.div variants={REVEAL_ITEM}>
            {statsState.status === 'error' ? (
              <div className="mt-4">
                <MaintenanceNotice />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                {renderStatsCard('visitorsToday', statsState, 'visitors', statsLabels)}
                {renderStatsCard('todayExtraction', statsState, 'extractions', statsLabels)}
                {renderStatsCard('downloadsToday', statsState, 'downloads', statsLabels)}
              </div>
            )}
          </motion.div>

          <motion.div variants={REVEAL_ITEM}>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-6 mb-3">
              <div className="h-px flex-1 bg-[var(--border-color)]/60" />
              <span className="uppercase tracking-[0.2em]">{t('share.title')}</span>
              <div className="h-px flex-1 bg-[var(--border-color)]/60" />
            </div>
            <div className="glass-card relative overflow-hidden border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <div className="pointer-events-none absolute -top-20 -right-14 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.22)_0%,rgba(59,130,246,0.08)_44%,transparent_74%)]" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,93,74,0.14)_0%,rgba(232,93,74,0.05)_42%,transparent_74%)]" />
              <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-muted)]">{t('share.subtitle')}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{t('share.hint')}</p>
                </div>
                <div className="hidden sm:block w-fit px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] border border-[var(--border-color)] text-[var(--text-muted)]">
                  {t('share.badge')}
                </div>
              </div>
              <div className="relative z-[1] grid grid-cols-2 sm:grid-cols-4 gap-2">
                {sharePlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handleShare(platform.id)}
                    className="inline-flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-[var(--border-color)] px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] hover:border-[var(--accent-primary)]/70 hover:bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.1)_36%,transparent_62%)] transition-colors"
                  >
                    {platform.icon}
                    <span className="truncate">{platform.label}</span>
                  </button>
                ))}
              </div>
              <div className="relative z-[1] flex flex-col items-stretch gap-2 rounded-xl border border-[var(--border-color)] bg-[linear-gradient(135deg,rgba(232,93,74,0.22),rgba(232,93,74,0.08)_34%,transparent_64%)] px-3 py-2 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 break-all text-xs sm:text-sm">{buildShareUrl('share-direct')}</span>
                <button
                  type="button"
                  onClick={() => handleShare('share-direct')}
                  className="inline-flex w-fit items-center gap-1 self-end text-[var(--text-primary)] sm:self-auto"
                >
                  {shareNotice ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {shareNotice ? t('share.copied') : tCommon('copy')}
                </button>
              </div>
              {shareNotice ? <div className="relative z-[1] text-xs text-[var(--text-muted)]">{shareNotice}</div> : null}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </SidebarLayout>
  );
}
