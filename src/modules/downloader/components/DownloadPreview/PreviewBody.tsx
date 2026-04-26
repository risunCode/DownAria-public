'use client';

import { type ReactNode } from 'react';
import { resolveBackendProxyUrl } from '@/shared/utils/proxy-url';
import { Archive, Download, Loader2, Maximize2, Play, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type DownloadTaskState, type PreviewFormat, type PreviewItem } from '@/modules/downloader/model/preview';
import { formatBytes } from '@/modules/downloader/services/preview';
import { type BatchProgressState } from '@/modules/downloader/services/batch-download';
import { getQualityBadge, taskToProgressShape } from '@/modules/downloader/utils/preview-helpers';
import { Button } from '@/shared/ui/Button';
import { SplitButton } from '@/shared/ui/SplitButton';
import { CheckCircleIcon } from '@/shared/ui/Icons';
import { DownloadProgress } from './DownloadProgress';

interface PreviewMultiItemProps {
  items: PreviewItem[];
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  selectedItem: PreviewItem | undefined;
  selectedFormat: PreviewFormat | null;
  isItemDownloading: boolean;
  isItemActive: boolean;
  batchRunning: boolean;
  zipProgress: BatchProgressState | null;
  task: DownloadTaskState;
  onOpenGallery: (itemId?: string) => void;
  onDownloadItem: (item: PreviewItem, format: PreviewFormat | null) => void;
  onDownloadAll: (forceZip?: boolean) => void;
  onCancelBatch: () => void;
  renderFormatPanel: (item: PreviewItem) => ReactNode;
}

interface PreviewSingleItemProps {
  item: PreviewItem;
  selectedFormat: PreviewFormat | null;
  isItemDownloading: boolean;
  isItemActive: boolean;
  task: DownloadTaskState;
  taskKey: string;
  onOpenGallery: (itemId?: string) => void;
  onDownloadItem: (item: PreviewItem, format: PreviewFormat | null) => void;
  onCancelItem: () => void;
  renderFormatPanel: (item: PreviewItem) => ReactNode;
}

export function PreviewMultiItem({
  items,
  selectedItemId,
  onSelectItem,
  selectedItem,
  selectedFormat,
  isItemDownloading,
  isItemActive,
  batchRunning,
  zipProgress,
  task,
  onOpenGallery,
  onDownloadItem,
  onDownloadAll,
  onCancelBatch,
  renderFormatPanel,
}: PreviewMultiItemProps) {
  const tPreview = useTranslations('download.preview');
  const itemIds = items.map((item) => item.id);
  const progress = zipProgress
    ? {
        percent: zipProgress.total > 0 ? (zipProgress.current / zipProgress.total) * 100 : 0,
        loaded: zipProgress.current,
        total: zipProgress.total,
        speed: 0,
        message: zipProgress.status,
        status: 'downloading' as const,
      }
    : taskToProgressShape(task);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 10).map((item, index) => (
          <ItemThumb
            key={item.id}
            item={item}
            index={index}
            isSelected={selectedItemId === item.id}
            onClick={() => onSelectItem(item.id)}
            hiddenOnMobile={index >= 4}
          />
        ))}
        {items.length > 4 && (
          <button
            type="button"
            onClick={() => onOpenGallery(items[0]?.id || '')}
            aria-label={tPreview('openGallery')}
            className={`relative aspect-square w-14 sm:w-16 rounded-lg overflow-hidden border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] bg-[var(--bg-secondary)] flex items-center justify-center transition-all hover:bg-[var(--bg-tertiary)] ${items.length <= 10 ? 'sm:hidden' : ''}`}
          >
            <span className="text-sm font-bold text-[var(--text-muted)] sm:hidden">+{items.length - 4}</span>
            {items.length > 10 && (
              <span className="text-sm font-bold text-[var(--text-muted)] hidden sm:block">+{items.length - 10}</span>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] min-w-0 overflow-hidden">
        <div className="flex flex-col gap-2 w-full sm:w-32 md:w-40 flex-shrink-0">
          <div
            className="relative w-full aspect-video rounded-lg overflow-hidden bg-[var(--bg-primary)] cursor-pointer group"
            onClick={() => onOpenGallery(selectedItem?.id || items[0]?.id || '')}
                      >
            {selectedItem?.thumbnailUrl ? (
              <img
                src={resolveBackendProxyUrl(selectedItem.thumbnailUrl) || selectedItem.thumbnailUrl}
                alt="Preview"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {selectedItem && renderFormatPanel(selectedItem)}
          <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => onOpenGallery(selectedItem?.id || items[0]?.id || '')}
              leftIcon={<Maximize2 className="w-3.5 h-3.5" />}
            >
              {tPreview('openGallery')}
            </Button>
            {isItemActive || batchRunning ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button size="xs" variant="secondary" disabled leftIcon={<Loader2 className="animate-spin w-3.5 h-3.5" />}>
                  {tPreview('downloading')}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={onCancelBatch}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                >
                  {tPreview('cancel')}
                </Button>
              </div>
            ) : (
              <SplitButton
                label={task.status === 'error' ? tPreview('retryDownload') : `${tPreview('download')}${selectedFormat?.sizeBytes ? ` (${formatBytes(selectedFormat.sizeBytes)})` : ''}`}
                icon={task.status === 'error' ? <RefreshCw className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                size="xs"
                variant={task.status === 'error' ? 'secondary' : 'primary'}
                onMainClick={() => selectedItem && onDownloadItem(selectedItem, selectedFormat)}
                options={[
                  {
                    id: 'download-this',
                    label: tPreview('downloadSelected'),
                    icon: <Download className="w-4 h-4" />,
                    description: selectedFormat?.sizeBytes ? formatBytes(selectedFormat.sizeBytes) : tPreview('downloadSelected'),
                    onClick: () => selectedItem && onDownloadItem(selectedItem, selectedFormat),
                  },
                  {
                    id: 'download-all',
                    label: tPreview('downloadAll'),
                    icon: <Download className="w-4 h-4" />,
                    description: `${itemIds.length} files, sequential`,
                    onClick: () => onDownloadAll(false),
                  },
                  {
                    id: 'download-zip',
                    label: tPreview('downloadZip'),
                    icon: <Archive className="w-4 h-4" />,
                    description: `Bundle all ${itemIds.length} files`,
                    onClick: () => onDownloadAll(true),
                  },
                ]}
              />
            )}
          </div>
          {(isItemDownloading || zipProgress) && (
            <DownloadProgress progress={progress} className="mt-3" />
          )}
        </div>
      </div>
    </div>
  );
}

export function PreviewSingleItem({
  item,
  selectedFormat,
  isItemDownloading,
  isItemActive,
  task,
  taskKey,
  onOpenGallery,
  onDownloadItem,
  onCancelItem,
  renderFormatPanel,
}: PreviewSingleItemProps) {
  const tPreview = useTranslations('download.preview');
  const progress = taskToProgressShape(task);

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 min-w-0 overflow-hidden">
      <div className="flex flex-col gap-2 w-full sm:w-40 md:w-48 lg:w-64 flex-shrink-0">
        <div
          className="relative w-full aspect-video rounded-xl overflow-hidden bg-[var(--bg-secondary)] cursor-pointer group"
          onClick={() => onOpenGallery(item.id)}
                  >
          {item.thumbnailUrl ? (
            <img
              src={resolveBackendProxyUrl(item.thumbnailUrl) || item.thumbnailUrl}
              alt={item.title || 'Preview'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-12 h-12 text-[var(--text-muted)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium">
              <Maximize2 className="w-4 h-4" />
              {tPreview('openGallery')}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
        {renderFormatPanel(item)}
        <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={() => onOpenGallery(item.id)}
            leftIcon={<Maximize2 className="w-3.5 h-3.5" />}
          >
            {tPreview('openGallery')}
          </Button>
          {isItemActive ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button size="xs" variant="secondary" disabled leftIcon={<Loader2 className="animate-spin w-3.5 h-3.5" />}>
                {tPreview('downloading')}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={onCancelItem}
                disabled={!taskKey}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
              >
                {tPreview('cancel')}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="xs"
              variant={task.status === 'error' ? 'secondary' : 'primary'}
              onClick={() => onDownloadItem(item, selectedFormat)}
              leftIcon={task.status === 'error' ? <RefreshCw className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            >
              {task.status === 'error' ? tPreview('retryDownload') : tPreview('download')}
              {! (task.status === 'error') && selectedFormat?.sizeBytes && (
                <span className="ml-1 opacity-70">({formatBytes(selectedFormat.sizeBytes)})</span>
              )}
            </Button>
          )}
        </div>
        {isItemDownloading && (
          <DownloadProgress progress={progress} className="mt-3" />
        )}
      </div>
    </div>
  );
}

function ItemThumb({
  item,
  index,
  isSelected,
  onClick,
  hiddenOnMobile,
}: {
  item: PreviewItem;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  hiddenOnMobile: boolean;
}) {
  const qualityBadge = getQualityBadge(item.formats);
  const isVideo = item.formats.some((format) => format.kind === 'video');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select item ${index + 1}`}
      className={`relative aspect-square w-14 sm:w-16 rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
          : 'border-[var(--border-color)] hover:border-[var(--accent-primary)] opacity-60 hover:opacity-100'
      } ${hiddenOnMobile ? 'hidden sm:block' : ''}`}
    >
      {item.thumbnailUrl ? (
        <img
          src={resolveBackendProxyUrl(item.thumbnailUrl) || item.thumbnailUrl}
          alt={`#${index + 1}`}
          className="w-full h-full object-cover"
          loading="eager"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)]">
          <Play className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
      )}
      <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
        {index + 1}
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
        <div className="absolute bottom-0.5 right-0.5">
          <Play className="w-3 h-3 text-white drop-shadow-md" fill="white" />
        </div>
      )}
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />
          <CheckCircleIcon className="w-6 h-6 text-[var(--accent-primary)] drop-shadow-lg relative z-10" />
        </div>
      )}
    </button>
  );
}
