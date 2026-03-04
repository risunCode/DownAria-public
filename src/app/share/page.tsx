'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { DownloadForm } from '@/features/downloader/components/DownloadForm';
import { DownloadPreview } from '@/features/downloader/components/DownloadPreview';
import { CardSkeleton } from '@/components/ui/Card';
import { PlatformId, MediaData } from '@/lib/types';
import type { HistoryEntry } from '@/lib/storage';
import { getPlatformCookie, getSkipCache } from '@/lib/storage';
import { platformDetect, sanitizeUrl } from '@/lib/utils/format';
import { fetchMediaWithCache } from '@/hooks/useScraperCache';

function ShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('share');
  const mapBackendErrorToPreview = (message?: string, code?: string) => {
    const normalizedCode = typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : undefined;
    const normalizedMessage = typeof message === 'string' && message.trim() ? message.trim() : t('error');

    const cookieTipCodes = new Set([
      'NO_MEDIA_FOUND',
      'PRIVATE_CONTENT',
      'COOKIE_REQUIRED',
      'AGE_RESTRICTED',
      'COOKIE_EXPIRED',
      'COOKIE_BANNED',
      'CHECKPOINT_REQUIRED',
    ]);

    if (normalizedCode && cookieTipCodes.has(normalizedCode)) {
      return {
        title: t('errors.extractionTitle'),
        message: normalizedMessage,
        code: normalizedCode,
        tip: t('errors.cookieTip'),
        tipHref: '/settings?tab=cookies',
      };
    }

    return {
      title: t('errors.extractionTitle'),
      message: normalizedMessage,
      code: normalizedCode,
    };
  };

  const [platform, setPlatform] = useState<PlatformId>('facebook');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [previewError, setPreviewError] = useState<{
    title: string;
    message: string;
    code?: string;
    tip?: string;
    tipHref?: string;
    showSettings?: boolean;
  } | null>(null);
  const [responseJson, setResponseJson] = useState<unknown>(null);
  const [sharedUrl, setSharedUrl] = useState<string>('');
  const [autoFetched, setAutoFetched] = useState(false);

  // Extract URL from share params
  useEffect(() => {
    // Priority: url > text (might contain URL) > title
    const url = searchParams.get('url');
    const text = searchParams.get('text');
    const title = searchParams.get('title');

    // Try to extract URL from params
    let extractedUrl = '';

    if (url) {
      extractedUrl = url;
    } else if (text) {
      // Text might contain URL - extract it
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        extractedUrl = urlMatch[0];
      }
    } else if (title) {
      // Sometimes URL is in title
      const urlMatch = title.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        extractedUrl = urlMatch[0];
      }
    }

    if (extractedUrl) {
      setSharedUrl(extractedUrl);
      const detected = platformDetect(extractedUrl);
      if (detected) {
        setPlatform(detected);
      }
    }
  }, [searchParams]);

  // Auto-fetch when URL is detected
  useEffect(() => {
    if (sharedUrl && !autoFetched && !isLoading && !mediaData) {
      setAutoFetched(true);
      handleSubmit(sharedUrl);
    }
  }, [sharedUrl, autoFetched, isLoading, mediaData]);

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setMediaData(null);
    setResponseJson(null);
    setPreviewError(null);

    const sanitizedUrl = sanitizeUrl(url);
    const detectedPlatform = platformDetect(sanitizedUrl) || platform;

    if (detectedPlatform !== platform) {
      setPlatform(detectedPlatform);
    }

    try {
      // Get platform cookie if available
      let platformCookie: string | undefined;
      if (detectedPlatform === 'weibo') {
        platformCookie = getPlatformCookie('weibo') || undefined;
      } else if (['facebook', 'instagram'].includes(detectedPlatform)) {
        platformCookie = getPlatformCookie(detectedPlatform as 'facebook' | 'instagram') || undefined;
      }

      // Use cached scraper
      const skipCache = getSkipCache();
      const result = await fetchMediaWithCache(sanitizedUrl, platformCookie, skipCache);

      if (!result.success) {
        setPreviewError(mapBackendErrorToPreview(result.error, result.errorCode));
        return;
      }

      setMediaData(result.data || null);
      setResponseJson(result.responseJson ?? result.data ?? null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('error');
      setPreviewError({
        title: t('failed'),
        message: errorMsg.length > 100 ? errorMsg.substring(0, 100) + '...' : errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadComplete = (_entry: HistoryEntry) => {
    // Optional: redirect to home after download
  };

  return (
    <SidebarLayout>
      <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center py-2 sm:py-4">
            <h1 className="text-xl sm:text-2xl font-bold gradient-text mb-1">
              {t('title')}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              {sharedUrl ? t('processing') : t('noUrl')}
            </p>
          </div>

          {/* Download Form - pre-filled with shared URL */}
          <DownloadForm
            platform={platform}
            onPlatformChange={setPlatform}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            initialUrl={sharedUrl}
            enableAutoSubmit={false}
          />

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

          {!isLoading && !mediaData && previewError && (
            <div className="glass-card p-4 sm:p-5 border border-red-500/30">
              <h3 className="text-sm sm:text-base font-semibold text-red-400 mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{previewError.title}</span>
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{previewError.message}</p>
              {previewError.code && (
                <p className="text-[11px] text-[var(--text-muted)] mt-2">{t('errors.codeLabel')}: {previewError.code}</p>
              )}
              {previewError.tip && (
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  {t('errors.tipLabel')}{' '}
                  {previewError.tipHref ? (
                    <a href={previewError.tipHref} className="text-[var(--accent-primary)] hover:underline">
                      {previewError.tip}
                    </a>
                  ) : (
                    previewError.tip
                  )}
                </p>
              )}
              {previewError.showSettings && (
                <div className="mt-3">
                  <a
                    href="/settings?tab=cookies"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {t('errors.openCookieSettings')}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Back to Home */}
          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t('backToHome')}
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <SidebarLayout>
        <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <CardSkeleton />
          </div>
        </div>
      </SidebarLayout>
    }>
      <ShareContent />
    </Suspense>
  );
}
