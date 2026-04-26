'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { resolveBackendProxyUrl } from '@/shared/utils/proxy-url';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  User,
  Loader2,
  Check,
  Archive,
  Eye,
  Heart,
  MessageCircle,
} from 'lucide-react';

import { type PreviewResult } from '@/modules/downloader/model/preview';
import {
  buildDownloadTaskKey,
  getPreviewFormatById,
} from '@/modules/downloader/services/preview';
import { executePreviewDownload } from '@/modules/downloader/services/download-client';
import { useDownloadTaskState } from '@/modules/downloader/services/download-store';
import { SplitButton } from '@/shared/ui/SplitButton';
import { FormatSelector } from '@/modules/downloader/components/DownloadPreview/FormatSelector';
import { DownloadProgress } from '@/modules/downloader/components/DownloadPreview/DownloadProgress';
import {
  useKeyboardNavigation,
  useMediaGalleryMode,
  useSwipeNavigation,
} from '@/modules/downloader/hooks/use-media-gallery-navigation';
import { GalleryShell } from './GalleryShell';
import { ResponseJsonModal } from '@/modules/downloader/components/DownloadPreview/modals';
import {
  runSequentialBatchDownloads,
  runZipDownload,
  type BatchProgressState,
} from '@/modules/downloader/services/batch-download';
import { formatBytes, formatNumber as formatCompactNumber, getQualityBadge, normalizeCookieSource, taskToProgressShape } from '@/modules/downloader/utils/preview-helpers';

const THUMBS_PER_PAGE = 10;

interface PreviewGalleryProps {
  result: PreviewResult;
  isOpen: boolean;
  initialItemId: string;
  selectedFormatIds: Record<string, string>;
  onClose: () => void;
  onSelectFormat: (itemId: string, formatId: string) => void;
}

export function PreviewGallery({
  result,
  isOpen,
  initialItemId,
  selectedFormatIds,
  onClose,
  onSelectFormat,
}: PreviewGalleryProps) {
  const tPreview = useTranslations('download.preview');
  const mode = useMediaGalleryMode();

  const { items, platform } = result;
  const isCarousel = items.length > 1;

  const resolvedCookieSource = normalizeCookieSource(result.cookieSource);
  const isPrivateContent =
    Boolean(result.usedCookie) ||
    resolvedCookieSource === 'client' ||
    resolvedCookieSource === 'server' ||
    result.publicContent === false;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbPage, setThumbPage] = useState(0);
  const [showResponseJsonModal, setShowResponseJsonModal] = useState(false);
  const [zipProgress, setZipProgress] = useState<BatchProgressState | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const idx = Math.max(0, items.findIndex((item) => item.id === initialItemId));
    setCurrentIndex(idx);
  }, [initialItemId, isOpen, items]);

  useEffect(() => {
    if (!isOpen) {
      setShowResponseJsonModal(false);
    }
  }, [isOpen]);

  const currentItem = items[currentIndex] || items[0];
  const currentFormatId = currentItem ? selectedFormatIds[currentItem.id] || currentItem.preferredFormatId : '';
  const currentFormat = currentItem
    ? getPreviewFormatById(currentItem, currentFormatId) || currentItem.formats[0] || null
    : null;

  const taskKey = currentItem && currentFormat ? buildDownloadTaskKey(result, currentItem, currentFormat) : '';
  const task = useDownloadTaskState(taskKey);
  const isDownloading =
    task.status === 'preparing' ||
    task.status === 'downloading' ||
    task.status === 'queued' ||
    task.status === 'polling';
  const isTaskActive = isDownloading || batchRunning;
  const isTaskDownloading = isTaskActive || task.status === 'error';

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  useEffect(() => {
    const targetPage = Math.floor(currentIndex / THUMBS_PER_PAGE);
    if (targetPage !== thumbPage) {
      setThumbPage(targetPage);
    }
  }, [currentIndex, thumbPage]);

  const goToThumbPage = useCallback((page: number) => {
    setThumbPage(page);
    setCurrentIndex(page * THUMBS_PER_PAGE);
  }, []);

  useKeyboardNavigation(onClose, goToPrev, goToNext, isOpen);

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigation(
    goToPrev,
    goToNext,
    isCarousel
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDownloadItem = async () => {
    if (!currentItem || !currentFormat) return;
    await executePreviewDownload(result, currentItem, currentFormat, taskKey);
  };

  const handleDownloadAll = async (asZip: boolean) => {
    setBatchRunning(true);
    try {
      if (asZip) {
        await runZipDownload({
          result,
          items,
          selectedFormatIds,
          onProgress: setZipProgress,
          t: (key) => tPreview(`batch.${key}`),
        });
      } else {
        await runSequentialBatchDownloads({
          result,
          items,
          selectedFormatIds,
          onProgress: setZipProgress,
          t: (key) => tPreview(`batch.${key}`),
        });
      }
    } finally {
      setBatchRunning(false);
      setZipProgress(null);
    }
  };

  const responseJsonText = useMemo(() => JSON.stringify(result.rawResponse ?? result, null, 2), [result]);

  const handleCopyResponseJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(responseJsonText);
    } catch {
      // ignore clipboard errors
    }
  }, [responseJsonText]);

  const downloadStatusShape = zipProgress
    ? {
        percent: zipProgress.total > 0 ? (zipProgress.current / zipProgress.total) * 100 : 0,
        loaded: zipProgress.current,
        total: zipProgress.total,
        speed: 0,
        message: zipProgress.status,
        status: 'downloading' as const,
      }
    : taskToProgressShape(task);

  const isHls =
    currentFormat?.protocol?.toLowerCase() === 'hls' ||
    (currentFormat?.sourceUrl?.includes('.m3u8') ?? false);

  const isYoutube = platform === 'youtube';
  const isVideo = currentFormat?.kind === 'video';

  const canDirectPlayYoutubeVideo =
    isYoutube && isVideo &&
    (currentFormat.qualityLabel?.includes('360') || !currentFormat.needsMerge);

  const showPreviewUnavailable = isVideo && (
    isHls ||
    (isYoutube && !canDirectPlayYoutubeVideo) ||
    (!isHls && !isYoutube && !currentFormat.isProgressive)
  );

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div
        className="relative w-full aspect-video max-h-[42vh] sm:max-h-[43vh] bg-black rounded-lg overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isVideo ? (
          showPreviewUnavailable ? (
            <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-[var(--bg-secondary)] to-black">
              {currentItem?.thumbnailUrl && (
                <img
                  src={resolveBackendProxyUrl(currentItem.thumbnailUrl) || currentItem.thumbnailUrl}
                  alt={currentItem.title || 'Preview'}
                  className="absolute inset-0 w-full h-full object-cover opacity-35 blur-md"
                />
              )}
              <div className="relative z-10 w-[92%] sm:w-[82%] max-w-2xl mx-4 p-3 sm:p-4 rounded-xl border border-white/15 bg-black/45 backdrop-blur-sm">
                <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[140px_1fr] gap-3 sm:gap-4 items-center">
                  <div className="relative w-24 h-16 sm:w-36 sm:h-24 rounded-lg overflow-hidden border border-white/15 bg-black/35">
                    {currentItem?.thumbnailUrl ? (
                      <img
                        src={resolveBackendProxyUrl(currentItem.thumbnailUrl) || currentItem.thumbnailUrl}
                        alt={currentItem.title || 'Thumbnail'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white/70" />
                      </div>
                    )}
                  </div>

                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{tPreview('previewUnavailableTitle')}</p>
                    <p className="text-xs text-white/70 mt-1">
                      {isYoutube
                        ? tPreview('youtubePreviewUnavailableBody')
                        : isHls
                        ? tPreview('hlsPreviewUnavailableBody')
                        : tPreview('genericPreviewUnavailableBody')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <video
              key={`${currentItem.id}-${currentFormat.id}`}
              controls
              playsInline
              preload="metadata"
              autoPlay
              poster={resolveBackendProxyUrl(currentItem?.thumbnailUrl) || currentItem?.thumbnailUrl}
              className="w-full h-full object-contain"
              src={resolveBackendProxyUrl(currentFormat.sourceUrl) || currentFormat.sourceUrl}
            />
          )
        ) : currentFormat?.kind === 'audio' ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-900/50 to-black">
            {currentItem?.thumbnailUrl && (
              <img
                src={resolveBackendProxyUrl(currentItem.thumbnailUrl) || currentItem.thumbnailUrl}
                alt={currentItem.title || 'Audio'}
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl"
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-sm">
              <div className="w-24 h-24 rounded-xl overflow-hidden shadow-2xl bg-[var(--bg-secondary)]">
                {currentItem?.thumbnailUrl ? (
                  <img
                    src={resolveBackendProxyUrl(currentItem.thumbnailUrl) || currentItem.thumbnailUrl}
                    alt={currentItem.title || 'Audio'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-white/50" />
                  </div>
                )}
              </div>
              <>
                <audio
                  key={`${currentItem.id}-${currentFormat.id}`}
                  src={resolveBackendProxyUrl(currentFormat.sourceUrl) || currentFormat.sourceUrl}
                  className="w-full"
                  controls
                  autoPlay
                />
                <p className="text-xs text-white/60 text-center">{tPreview('audioOnly')}</p>
              </>
            </div>
          </div>
        ) : currentFormat?.kind === 'image' ? (
          <img
            key={`${currentItem.id}-${currentFormat.id}`}
            src={resolveBackendProxyUrl(currentFormat.sourceUrl) || currentFormat.sourceUrl}
            alt={currentItem?.title || 'Image'}
            className="w-full h-full object-contain"
          />
        ) : currentItem?.thumbnailUrl ? (
          <img
            key={`${currentItem.id}-thumb`}
            src={resolveBackendProxyUrl(currentItem.thumbnailUrl) || currentItem.thumbnailUrl}
            alt={currentItem?.title || 'Media'}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-white/50" />
          </div>
        )}

        {isCarousel && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goToPrev();
              }}
              aria-label={tPreview('previous')}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-20 touch-manipulation"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goToNext();
              }}
              aria-label={tPreview('next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-20 touch-manipulation"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {isCarousel && (
        <div className="flex items-center gap-2 px-4 py-2">
          {thumbPage > 0 && (
            <button
              type="button"
              onClick={() => goToThumbPage(thumbPage - 1)}
              aria-label={tPreview('previous')}
              className="flex-shrink-0 w-8 h-14 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors"
              title="Previous images"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          )}

          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
            {items.slice(thumbPage * THUMBS_PER_PAGE, (thumbPage + 1) * THUMBS_PER_PAGE).map((item, pageIdx) => {
              const idx = thumbPage * THUMBS_PER_PAGE + pageIdx;
              const isVideo = item.formats.some((format) => format.kind === 'video');
              const qualityBadge = getQualityBadge(item.formats);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={tPreview('itemLabel', { index: idx + 1, total: items.length })}
                  className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all ${
                    idx === currentIndex
                      ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-card)]'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={resolveBackendProxyUrl(item.thumbnailUrl) || item.thumbnailUrl}
                      alt={`Item ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading={idx < 5 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center">
                      <span className="text-xs text-[var(--text-muted)]">{idx + 1}</span>
                    </div>
                  )}
                  <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  {qualityBadge && (
                    <div
                      className={`absolute top-0.5 right-0.5 px-1 py-0.5 rounded text-[8px] font-bold ${
                        qualityBadge === '4K' || qualityBadge === 'FHD'
                          ? 'bg-purple-500/90 text-white'
                          : qualityBadge === 'HD'
                          ? 'bg-blue-500/90 text-white'
                          : 'bg-gray-500/90 text-white'
                      }`}
                    >
                      {qualityBadge}
                    </div>
                  )}
                  {isVideo && !qualityBadge && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {(thumbPage + 1) * THUMBS_PER_PAGE < items.length && (
            <button
              type="button"
              onClick={() => goToThumbPage(thumbPage + 1)}
              aria-label={tPreview('next')}
              className="flex-shrink-0 w-8 h-14 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors"
              title={`More images (${items.length - (thumbPage + 1) * THUMBS_PER_PAGE} remaining)`}
            >
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          )}

          {items.length > THUMBS_PER_PAGE && (
            <div className="flex-shrink-0 text-xs text-[var(--text-muted)] px-2">
              {thumbPage * THUMBS_PER_PAGE + 1}-{Math.min((thumbPage + 1) * THUMBS_PER_PAGE, items.length)}/{items.length}
            </div>
          )}
        </div>
      )}

      <div className="p-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-[var(--text-primary)] truncate">
              {result.authorName || result.authorHandle || 'Unknown'}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
              <span className="truncate">
                {result.authorHandle ? `${result.authorHandle} • ` : ''}
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </span>
              {result.engagement.views != null && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3 h-3 text-sky-400" />
                  {formatCompactNumber(result.engagement.views)}
                </span>
              )}
              {result.engagement.likes != null && (
                <span className="inline-flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400" />
                  {formatCompactNumber(result.engagement.likes)}
                </span>
              )}
              {result.engagement.comments != null && (
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-emerald-400" />
                  {formatCompactNumber(result.engagement.comments)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {(result.cached || (typeof result.responseTimeMs === 'number' && result.responseTimeMs > 0)) && (
              <button
                type="button"
                aria-label="Show extraction response JSON"
                onClick={() => setShowResponseJsonModal(true)}
                className={`inline-flex items-center px-2 py-1 text-[10px] rounded-full ${
                  result.cached
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {result.cached ? tPreview('cached') : `${result.responseTimeMs}ms`}
              </button>
            )}
            <span
              className={`px-2 py-1 text-[10px] rounded-full ${
                isPrivateContent
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-green-500/20 text-green-400'
              }`}
            >
              {isPrivateContent ? tPreview('withCookie') : tPreview('guest')}
            </span>
          </div>
        </div>

        {currentItem && (
          <FormatSelector
            formats={currentItem.formats}
            selectedFormatId={currentFormatId}
            onSelect={(formatId) => onSelectFormat(currentItem.id, formatId)}
          />
        )}
      </div>
    </motion.div>
  );

  const actionButtons = (
    <div className="p-4 space-y-3 border-t border-[var(--border-color)]/50 bg-[var(--bg-card)]">
      <div className="flex items-center gap-2">
        {isCarousel ? (
          <>
            <button
              type="button"
              onClick={handleDownloadItem}
              disabled={isTaskActive || !currentFormat}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isTaskActive ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Downloading...
                </>
              ) : task.status === 'error' ? (
                <>
                  <Download className="w-4 h-4" />
                  {tPreview('retryDownload')}
                </>
              ) : task.status === 'completed' ? (
                <>
                  <Check className="w-4 h-4" />
                  Done!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                  {currentFormat?.sizeBytes && (
                    <span className="opacity-70">({formatBytes(currentFormat.sizeBytes)})</span>
                  )}
                </>
              )}
            </button>
            <SplitButton
              label="Action"
              icon={<Archive className="w-4 h-4" />}
              disabled={isTaskActive}
              size="sm"
              variant="secondary"
              options={[
                {
                  id: 'download-all',
                  label: 'All Items',
                  icon: <Download className="w-4 h-4" />,
                  description: `${items.length} files, one by one`,
                  onClick: () => handleDownloadAll(false),
                },
                {
                  id: 'download-zip',
                  label: 'Download as ZIP',
                  icon: <Archive className="w-4 h-4" />,
                  description: `Bundle ${items.length} files`,
                  onClick: () => handleDownloadAll(true),
                },
              ]}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={handleDownloadItem}
            disabled={isTaskActive || !currentFormat}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isTaskActive ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Downloading...
              </>
            ) : task.status === 'error' ? (
              <>
                <Download className="w-4 h-4" />
                {tPreview('retryDownload')}
              </>
            ) : task.status === 'completed' ? (
              <>
                <Check className="w-4 h-4" />
                Done!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download
                {currentFormat?.sizeBytes && (
                  <span className="opacity-70">({formatBytes(currentFormat.sizeBytes)})</span>
                )}
              </>
            )}
          </button>
        )}
      </div>

      {(isTaskDownloading || zipProgress || task.status === 'completed') && (
        <DownloadProgress progress={downloadStatusShape} />
      )}
    </div>
  );

  return (
    <>
      <GalleryShell mode={mode} isOpen={isOpen} onClose={onClose} footer={actionButtons}>
        {content}
      </GalleryShell>

      <ResponseJsonModal
        isOpen={showResponseJsonModal}
        onClose={() => setShowResponseJsonModal(false)}
        responseJsonText={responseJsonText}
        onCopy={handleCopyResponseJson}
      />
    </>
  );
}
