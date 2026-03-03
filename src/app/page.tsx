'use client';

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Settings } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { DownloadForm } from '@/components/download/DownloadForm';
import { DownloadPreview } from '@/components/download/DownloadPreview';
import { HistoryList } from '@/components/download/HistoryList';
import { RateLimitModal } from '@/components/ui/RateLimitModal';

import { CardSkeleton } from '@/components/ui/Card';
import { MagicIcon, BoltIcon, LayersIcon, LockIcon } from '@/components/ui/Icons';
import { PlatformId, MediaData } from '@/lib/types';
import { ErrorActionTypes } from '@/lib/errors';
import { addHistory } from '@/lib/storage';
import { platformDetect, sanitizeUrl } from '@/lib/utils/format';
import { useMediaExtraction } from '@/hooks/useMediaExtraction';

// ============================================================================
// CONSTANTS
// ============================================================================

const TITLE_VARIANTS = ['Social Media', 'Facebook', 'Instagram', 'Twitter / X', 'Pixiv', 'YouTube Music'];

// ============================================================================
// COMPONENTS
// ============================================================================

function AnimatedTitle() {
  const [index, setIndex] = useState(0);
  const t = useTranslations('home');

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TITLE_VARIANTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

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
          {TITLE_VARIANTS[index]}
        </motion.span>
      </AnimatePresence>
      <span className="text-[var(--text-primary)]"> {t('titleSuffix')}</span>
    </h1>
  );
}

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    platform,
    isLoading,
    mediaData,
    error: extractionError,
    responseJson,
    extract,
    retry,
    reset,
    setPlatform,
  } = useMediaExtraction({ initialPlatform: 'facebook' });
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [rateLimitModalOpen, setRateLimitModalOpen] = useState(false);
  const [lastSubmittedUrl, setLastSubmittedUrl] = useState<string | null>(null);
  const [lastDetectedPlatform, setLastDetectedPlatform] = useState<PlatformId>('facebook');
  const lastPersistedHistoryKeyRef = useRef<string | null>(null);
  const lastRefetchKeyRef = useRef<string | null>(null);
  const t = useTranslations('home');

  const handleDownloadComplete = () => {
    setHistoryRefresh(prev => prev + 1);
  };

  const persistExtractHistory = useCallback(async (extractResult: MediaData, sourceUrl: string, fallbackPlatform: PlatformId) => {
    const firstFormat = extractResult.formats?.[0];
    const detectedPlatform = (extractResult.platform as PlatformId | undefined) || fallbackPlatform;

    try {
      await addHistory({
        platform: detectedPlatform,
        contentId: sourceUrl,
        resolvedUrl: sourceUrl,
        title: extractResult.title || 'Untitled',
        thumbnail: extractResult.thumbnail || '',
        author: extractResult.author || 'Unknown',
        quality: firstFormat?.quality || 'Extracted',
        type: firstFormat?.type || 'video',
      });

      setHistoryRefresh(prev => prev + 1);
    } catch (historyError) {
      console.error('[Home] Failed to save extraction history:', historyError);
    }
  }, []);

  const toResetAtSeconds = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      if (value > 1_000_000_000_000) return Math.floor(value / 1000);
      return Math.floor(value);
    }

    if (typeof value === 'string' && value.trim()) {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) return toResetAtSeconds(numeric);

      const timestamp = Date.parse(value);
      if (!Number.isNaN(timestamp) && timestamp > 0) {
        return Math.floor(timestamp / 1000);
      }
    }

    return null;
  };

  const rateLimitModalData = useMemo(() => {
    if (!extractionError) return null;

    const metadata = extractionError.metadata || {};
    const code = extractionError.code?.toUpperCase();
    const has429Code = typeof extractionError.code === 'string' && extractionError.code.includes('429');
    const has429Metadata = metadata.status === 429;
    const isRateLimited = extractionError.category === 'RATE_LIMIT'
      || code?.includes('RATE_LIMIT')
      || has429Code
      || has429Metadata;

    if (!isRateLimited) return null;

    const resetAt = toResetAtSeconds(metadata.resetAt);
    if (!resetAt) return null;

    const limit = typeof metadata.limit === 'number' ? metadata.limit : undefined;
    const windowStr = typeof metadata.window === 'string' ? metadata.window : undefined;

    return {
      resetAt,
      limit,
      window: windowStr,
      message: extractionError.message,
    };
  }, [extractionError]);

  const executeErrorAction = useCallback(async (actionType: string) => {
    if (actionType === ErrorActionTypes.RETRY || actionType === ErrorActionTypes.WAIT_AND_RETRY) {
      await retry();
      return;
    }

    if (actionType === ErrorActionTypes.OPEN_SETTINGS) {
      router.push('/settings?tab=cookies');
      return;
    }

    if (actionType === ErrorActionTypes.GO_HOME) {
      router.push('/');
      return;
    }

    reset();
  }, [retry, reset, router]);

  const handleSubmit = async (url: string) => {
    setLastSubmittedUrl(url);
    const sanitizedUrl = sanitizeUrl(url);
    const detectedPlatform = platformDetect(sanitizedUrl) || platform;
    setLastDetectedPlatform(detectedPlatform);
    await extract(url);
  };

  useEffect(() => {
    const refetchRaw = searchParams.get('refetch');
    if (!refetchRaw) return;

    const refetchTs = searchParams.get('refetchTs') || '';
    const refetchPlatform = searchParams.get('refetchPlatform') as PlatformId | null;
    const refetchKey = `${refetchRaw}|${refetchTs}`;
    if (lastRefetchKeyRef.current === refetchKey) return;
    lastRefetchKeyRef.current = refetchKey;

    const refetchUrl = sanitizeUrl(refetchRaw);
    if (!refetchUrl) return;

    const detectedPlatform = platformDetect(refetchUrl) || refetchPlatform || platform;
    setLastSubmittedUrl(refetchUrl);
    setLastDetectedPlatform(detectedPlatform);
    setPlatform(detectedPlatform);
    void extract(refetchUrl);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('refetch');
    params.delete('refetchPlatform');
    params.delete('refetchTs');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [extract, pathname, platform, router, searchParams, setPlatform]);

  useEffect(() => {
    if (!rateLimitModalData) return;
    setRateLimitModalOpen(true);
  }, [rateLimitModalData]);

  useEffect(() => {
    if (!mediaData) return;

    const sourceUrl = typeof mediaData.url === 'string' && mediaData.url.trim()
      ? mediaData.url
      : sanitizeUrl(lastSubmittedUrl || '');

    if (!sourceUrl) return;

    const mediaIdentity = mediaData.formats?.[0]?.url || mediaData.id || mediaData.title;
    const dedupeKey = `${sourceUrl}|${mediaIdentity}`;
    if (lastPersistedHistoryKeyRef.current === dedupeKey) return;

    lastPersistedHistoryKeyRef.current = dedupeKey;
    const fallbackPlatform = (mediaData.platform as PlatformId | undefined) || lastDetectedPlatform || platform;
    void persistExtractHistory(mediaData, sourceUrl, fallbackPlatform);
  }, [mediaData, lastSubmittedUrl, lastDetectedPlatform, platform, persistExtractHistory]);


  // Batch queue handlers


  return (
    <SidebarLayout>
      <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          {/* Announcements */}

          {/* Compact Hero */}
          <div className="text-center py-2 sm:py-4">
            <AnimatedTitle />
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-3">
              {t('subtitle')}
            </p>
            {/* Feature badges */}
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
          </div>

          {/* Download Form */}
          <DownloadForm
            platform={platform}
            onPlatformChange={setPlatform}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />

          {/* Compact Ad - Below Input (always visible) */}

          {/* Loading */}
          <AnimatePresence>
            {isLoading && <CardSkeleton />}
          </AnimatePresence>

          {/* Preview */}
          <AnimatePresence mode="wait">
            {!isLoading && mediaData && (
              <DownloadPreview
                data={mediaData}
                platform={((mediaData.platform as PlatformId | undefined) || platform)}
                responseJson={responseJson}
                onDownloadComplete={handleDownloadComplete}
              />
            )}
          </AnimatePresence>

          {!isLoading && !mediaData && extractionError && (
            <div className="glass-card p-4 sm:p-5 border border-red-500/30">
              <h3 className="text-sm sm:text-base font-semibold text-red-400 mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{extractionError.title}</span>
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{extractionError.message}</p>
              {extractionError.code && (
                <p className="text-[11px] text-[var(--text-muted)] mt-2">Code: {extractionError.code}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {extractionError.actions.map((action) => (
                  <button
                    key={action.type}
                    type="button"
                    onClick={() => { void executeErrorAction(action.type); }}
                    className={action.primary
                      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity'
                      : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors'}
                  >
                    {action.type === ErrorActionTypes.RETRY || action.type === ErrorActionTypes.WAIT_AND_RETRY ? (
                      <RotateCcw className="w-3.5 h-3.5" />
                    ) : null}
                    {action.type === ErrorActionTypes.OPEN_SETTINGS ? (
                      <Settings className="w-3.5 h-3.5" />
                    ) : null}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {rateLimitModalData && (
            <RateLimitModal
              isOpen={rateLimitModalOpen}
              onClose={() => setRateLimitModalOpen(false)}
              resetAt={rateLimitModalData.resetAt}
              limit={rateLimitModalData.limit}
              window={rateLimitModalData.window}
              message={rateLimitModalData.message}
            />
          )}

          {/* Download History */}
          <div className="mt-8">
            <Suspense fallback={null}>
              <HistoryList refreshTrigger={historyRefresh} compact />
            </Suspense>
          </div>


          {/* Compact Ads - Bottom of page */}
        </div>
      </div>
    </SidebarLayout>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
