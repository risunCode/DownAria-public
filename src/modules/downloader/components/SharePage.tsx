'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { SidebarLayout } from '@/shared/layout/Sidebar';
import { CardSkeleton } from '@/shared/ui/Card';
import {
  createIdleDownloaderRequestState,
  createMaintenanceDownloaderRequestState,
  type DownloaderSubmission,
  type DownloaderRequestState,
} from '@/modules/downloader';
import { type PlatformId } from '@/modules/media';
import { DownloadForm } from '@/modules/downloader/components/DownloadForm';
import { ErrorNotice } from '@/modules/downloader/components/ErrorNotice';
import { DownloadPreview } from '@/modules/downloader/components/DownloadPreview';
import { DownloadPreviewSkeleton } from '@/modules/downloader/components/DownloadPreview/DownloadPreviewSkeleton';
import { MaintenanceNotice } from '@/modules/downloader/components/MaintenanceNotice';
import { extractSharedUrlCandidate, getDownloaderMaintenanceConfig, resolveDownloaderSubmission } from '@/modules/downloader/services';
import { isBackendExtractData, isBackendResponse, type BackendExtractData, type BackendResponse } from '@/infra/api/types';

function ShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('share');

  const [platform, setPlatform] = useState<PlatformId>('facebook');
  const [sharedUrl, setSharedUrl] = useState('');
  const [requestState, setRequestState] = useState<DownloaderRequestState>(createIdleDownloaderRequestState());
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BackendResponse<BackendExtractData> | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestErrorCode, setRequestErrorCode] = useState<string | null>(null);
  const maintenance = getDownloaderMaintenanceConfig();
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!resultRef.current) {
      return;
    }

    const { top, bottom } = resultRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (top >= 24 && bottom <= viewportHeight - 24) {
      return;
    }

    const targetTop = Math.max(0, window.scrollY + top - 24);
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [result, requestError]);

  useEffect(() => {
    const extractedUrl = extractSharedUrlCandidate(new URLSearchParams(searchParams.toString()));

    if (!extractedUrl) return;

    const submission = resolveDownloaderSubmission(extractedUrl, platform);
    if (!submission.ok) return;
    setSharedUrl(submission.url);
    setPlatform(submission.platform);
    setRequestState(createMaintenanceDownloaderRequestState({ url: submission.url, platform: submission.platform }));
  }, [searchParams]);

  const handleSubmit = async ({ url, platform: submissionPlatform }: DownloaderSubmission) => {
    setPlatform(submissionPlatform);
    setRequestState(createIdleDownloaderRequestState());
    setIsLoading(true);
    setResult(null);
    setRequestError(null);
    setRequestErrorCode(null);

    try {
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
  };

  return (
    <SidebarLayout>
      <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <div className="text-center py-2 sm:py-4">
            <h1 className="text-xl sm:text-2xl font-bold gradient-text mb-1">{t('title')}</h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              {sharedUrl ? t('processing') : t('noUrl')}
            </p>
          </div>

          <DownloadForm
            platform={platform}
            onPlatformChange={setPlatform}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            initialUrl={sharedUrl}
            enableAutoSubmit={false}
          />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="share-preview-loading"
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
            <div ref={resultRef}>
              <ErrorNotice code={requestErrorCode} message={requestError} />
            </div>
          ) : null}

          {result ? <div ref={resultRef}><DownloadPreview key={result.data?.url} result={result} /></div> : null}

          {requestState.status === 'maintenance' ? <MaintenanceNotice submittedUrl={requestState.submittedUrl} /> : null}

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

export function SharePage() {
  return (
    <Suspense
      fallback={
        <SidebarLayout>
          <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <CardSkeleton />
            </div>
          </div>
        </SidebarLayout>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
