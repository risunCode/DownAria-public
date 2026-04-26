'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { type BackendExtractData, type BackendResponse } from '@/infra/api/types';
import { type PreviewFormat, type PreviewItem } from '@/modules/downloader/model/preview';
import { executePreviewDownload } from '@/modules/downloader/services/download-client';
import { cancelDownload, useDownloadTaskState } from '@/modules/downloader/services/download-store';
import {
  buildDownloadTaskKey,
  getPreviewFormatById,
  toPreviewResult,
} from '@/modules/downloader/services/preview';
import { runSequentialBatchDownloads, runZipDownload, type BatchProgressState } from '@/modules/downloader/services/batch-download';
import { normalizeCookieSource } from '@/modules/downloader/utils/preview-helpers';
import { PreviewGallery } from '@/modules/downloader/components/PreviewGallery';
import { CookieInfoModal, ResponseJsonModal } from './modals';
import { PreviewHeader, PreviewFormatPanel } from './MetaPanel';
import { PreviewMultiItem, PreviewSingleItem } from './PreviewBody';

interface DownloadPreviewProps {
  result: BackendResponse<BackendExtractData>;
}

const ZIP_THRESHOLD = 10;

export function DownloadPreview({ result: responseEnvelope }: DownloadPreviewProps) {
  const tPreview = useTranslations('download.preview');
  const preview = useMemo(() => toPreviewResult(responseEnvelope), [responseEnvelope]);
  const { items, platform, contentType } = preview;

  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [selectedFormatIds, setSelectedFormatIds] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.preferredFormatId || item.formats[0]?.id || '']))
  );
  const [showGallery, setShowGallery] = useState(false);
  const [galleryInitialItemId, setGalleryInitialItemId] = useState<string>('');
  const [showResponseJsonModal, setShowResponseJsonModal] = useState(false);
  const [showCookieInfo, setShowCookieInfo] = useState(false);
  const [zipProgress, setZipProgress] = useState<BatchProgressState | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  const batchAbortRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelectedItemId(items[0]?.id || '');
    setSelectedFormatIds(
      Object.fromEntries(items.map((item) => [item.id, item.preferredFormatId || item.formats[0]?.id || '']))
    );
  }, [items]);

  const selectedItem = items.find((item) => item.id === selectedItemId) || items[0];
  const selectedFormatId = selectedItem ? selectedFormatIds[selectedItem.id] || selectedItem.preferredFormatId : '';
  const selectedFormat = selectedItem
    ? getPreviewFormatById(selectedItem, selectedFormatId) || selectedItem.formats[0] || null
    : null;

  const taskKey = selectedItem && selectedFormat ? buildDownloadTaskKey(preview, selectedItem, selectedFormat) : '';
  const task = useDownloadTaskState(taskKey);
  const isItemActive =
    task.status === 'preparing' ||
    task.status === 'downloading' ||
    task.status === 'queued' ||
    task.status === 'polling';
  const isItemDownloading = isItemActive || task.status === 'error';

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const isMultiItem = itemIds.length > 1;

  const resolvedCookieSource = normalizeCookieSource(preview.cookieSource);
  const isPrivateContent =
    Boolean(preview.usedCookie) ||
    resolvedCookieSource === 'client' ||
    resolvedCookieSource === 'server' ||
    preview.publicContent === false;

  const responseJsonText = useMemo(
    () => JSON.stringify(preview.rawResponse ?? responseEnvelope, null, 2),
    [preview.rawResponse, responseEnvelope]
  );

  const handleCopyResponseJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(responseJsonText);
    } catch {
      // ignore clipboard errors
    }
  }, [responseJsonText]);

  const handleSelectFormat = (itemId: string, formatId: string) => {
    setSelectedFormatIds((prev) => ({ ...prev, [itemId]: formatId }));
  };

  const handleDownloadItem = async (item: PreviewItem, format: PreviewFormat | null) => {
    if (!format) return;
    const key = buildDownloadTaskKey(preview, item, format);
    await executePreviewDownload(preview, item, format, key);
  };

  const handleDownloadAll = async (forceZip = false) => {
    if (items.length === 0) {
      return;
    }

    const shouldZip = forceZip || itemIds.length > ZIP_THRESHOLD;
    batchAbortRef.current.cancelled = false;
    batchAbortControllerRef.current = new AbortController();
    setBatchRunning(true);

    try {
      if (shouldZip) {
        await runZipDownload({
          result: preview,
          items,
          selectedFormatIds,
          onProgress: setZipProgress,
          abortRef: batchAbortRef.current,
          abortSignal: batchAbortControllerRef.current.signal,
          t: (key) => tPreview(`batch.${key}`),
        });
      } else {
        await runSequentialBatchDownloads({
          result: preview,
          items,
          selectedFormatIds,
          onProgress: setZipProgress,
          abortRef: batchAbortRef.current,
          abortSignal: batchAbortControllerRef.current.signal,
          t: (key) => tPreview(`batch.${key}`),
        });
      }
    } finally {
      batchAbortControllerRef.current = null;
      setBatchRunning(false);
      setZipProgress(null);
    }
  };

  const handleCancelBatch = () => {
    batchAbortRef.current.cancelled = true;
    batchAbortControllerRef.current?.abort();
    batchAbortControllerRef.current = null;
    setBatchRunning(false);
    setZipProgress(null);
  };

  const handleCancelItem = () => {
    if (taskKey) {
      cancelDownload(taskKey);
    }
  };

  const handleOpenGallery = (itemId?: string) => {
    setGalleryInitialItemId(itemId || items[0]?.id || '');
    setShowGallery(true);
  };

  const renderFormatPanel = (item: PreviewItem) => (
    <PreviewFormatPanel
      item={item}
      selectedFormatId={selectedFormatIds[item.id] || item.preferredFormatId}
      onSelectFormat={(formatId) => handleSelectFormat(item.id, formatId)}
    />
  );

  if (!items || items.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-[var(--text-muted)]">{tPreview('noPreview')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-3 sm:p-4 overflow-hidden shiny-border"
    >
      <PreviewHeader
        title={preview.title}
        cached={preview.cached}
        responseTimeMs={preview.responseTimeMs}
        isPrivateContent={isPrivateContent}
        onShowResponseJson={() => setShowResponseJsonModal(true)}
        onShowCookieInfo={() => setShowCookieInfo(true)}
        authorName={preview.authorName}
        authorHandle={preview.authorHandle}
        itemCount={itemIds.length}
        engagement={preview.engagement}
      />

      {isMultiItem ? (
        <PreviewMultiItem
          items={items}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          selectedItem={selectedItem}
          selectedFormat={selectedFormat}
          isItemDownloading={isItemDownloading}
          isItemActive={isItemActive}
          batchRunning={batchRunning}
          zipProgress={zipProgress}
          task={task}
          onOpenGallery={handleOpenGallery}
          onDownloadItem={handleDownloadItem}
          onDownloadAll={handleDownloadAll}
          onCancelBatch={handleCancelBatch}
          renderFormatPanel={renderFormatPanel}
        />
      ) : (
        <PreviewSingleItem
          item={items[0]}
          selectedFormat={selectedFormat}
          isItemDownloading={isItemDownloading}
          isItemActive={isItemActive}
          task={task}
          taskKey={taskKey}
          onOpenGallery={handleOpenGallery}
          onDownloadItem={handleDownloadItem}
          onCancelItem={handleCancelItem}
          renderFormatPanel={renderFormatPanel}
        />
      )}

      <PreviewGallery
        result={preview}
        isOpen={showGallery}
        initialItemId={galleryInitialItemId || items[0]?.id || ''}
        selectedFormatIds={selectedFormatIds}
        onClose={() => setShowGallery(false)}
        onSelectFormat={(itemId, formatId) => setSelectedFormatIds((prev) => ({ ...prev, [itemId]: formatId }))}
      />

      <ResponseJsonModal
        isOpen={showResponseJsonModal}
        onClose={() => setShowResponseJsonModal(false)}
        responseJsonText={responseJsonText}
        onCopy={handleCopyResponseJson}
      />

      <CookieInfoModal
        isOpen={showCookieInfo}
        isPrivateContent={isPrivateContent}
        platform={platform}
        cookieSource={resolvedCookieSource}
        onClose={() => setShowCookieInfo(false)}
      />

      <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
        <span aria-hidden="true">⚠️</span>
        <span>
          {tPreview('downloadLimitNotice')}
        </span>
      </div>

      {platform === 'facebook' && contentType === 'carousel' && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center gap-2">
          <span aria-hidden="true">ℹ️</span>
          <span>{tPreview('facebookCarouselNotice')}</span>
        </div>
      )}
    </motion.div>
  );
}
