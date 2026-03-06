'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
    Download,
    Play,
    User,
    Eye,
    Loader2,
    Maximize2,
    Send,
    Archive,
    ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MediaData, MediaFormat, PlatformId } from '@/lib/types';
import { type HistoryEntry } from '@/lib/storage';
import { LayersIcon, CheckCircleIcon } from '@/components/ui/Icons';
import { formatBytes } from '@/lib/utils/format';
import { getProxiedThumbnail } from '@/lib/api/proxy';
import { useTranslations } from 'next-intl';
import { MediaGallery } from '@/features/media/components';
import { lazySwal, getCachedSwal } from '@/lib/utils/lazy-swal';
import {
    groupFormatsByItem,
    getDisplayFormatsForPlatform,
    getMediaFormatIdentity,
    getItemThumbnails,
    findPreferredFormat,
    getQualityBadge,
    buildSelectorFormats,
} from '@/lib/utils/media';
import { useDownloadSync } from '@/hooks/useDownloadSync';
import { useDownloadAction } from '@/hooks/useDownloadAction';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { MAX_FILESIZE_BYTES, MAX_FILESIZE_LABEL, MAX_FILESIZE_MB } from '@/lib/constants/download-limits';

import { EngagementDisplay } from '@/features/media/components/EngagementDisplay';
import { FormatSelector } from '@/features/media/components/FormatSelector';
import { DownloadProgress } from '@/features/media/components/DownloadProgress';
import { LazyThumbnail } from '@/features/media/components/LazyThumbnail';
import { SplitButton } from '@/components/ui/SplitButton';
import { Modal } from '@/components/ui/Modal';
import { TrafficLights } from '@/components/ui/TrafficLights';

// ═══════════════════════════════════════════════════════════════
// TYPES & PROPS
// ═══════════════════════════════════════════════════════════════

interface DownloadPreviewProps {
    data: MediaData;
    platform: PlatformId;
    responseJson?: unknown;
    onDownloadComplete?: (entry: HistoryEntry) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DownloadPreview({ data, platform, responseJson, onDownloadComplete }: DownloadPreviewProps) {
    const [showGallery, setShowGallery] = useState(false);
    const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
    const [showResponseJsonModal, setShowResponseJsonModal] = useState(false);

    const t = useTranslations('download.preview');

    // Safety check
    if (!data || !data.formats || data.formats.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 text-center"
            >
                <p className="text-[var(--text-muted)]">No media formats available</p>
            </motion.div>
        );
    }

    // Memoized format grouping
    const formats = useMemo(
        () => getDisplayFormatsForPlatform(data.formats || [], platform),
        [data.formats, platform]
    );
    const groupedItems = useMemo(() => groupFormatsByItem(formats), [formats]);
    const itemThumbnails = useMemo(() => getItemThumbnails(formats), [formats]);

    const itemIds = Object.keys(groupedItems);
    const isMultiItem = itemIds.length > 1;
    const authorHandle = data.authorUsername;
    const normalizedAuthorHandle = authorHandle
        ? authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`
        : null;
    const displayAuthor = data.author || data.authorAlias || normalizedAuthorHandle;
    const hasAuthorMeta = Boolean(displayAuthor || normalizedAuthorHandle);
    const disableAudioConvertForFacebookStory =
        platform === 'facebook' && (
            (data.contentType || '').toLowerCase() === 'story' ||
            /\/stories(?:\/|$)/i.test(data.url || '')
        );
    const includeSyntheticAudio = !disableAudioConvertForFacebookStory;

    // State for selected format per item
    const getSelectorFormatsForItem = useCallback((itemId: string): MediaFormat[] => {
        const itemFormats = groupedItems[itemId] || [];
        return buildSelectorFormats(itemFormats, platform, includeSyntheticAudio);
    }, [groupedItems, includeSyntheticAudio, platform]);

    const [selectedFormats, setSelectedFormats] = useState<Record<string, MediaFormat>>(() => {
        const initial: Record<string, MediaFormat> = {};
        itemIds.forEach(id => {
            const preferred = findPreferredFormat(buildSelectorFormats(groupedItems[id] || [], platform, includeSyntheticAudio));
            if (preferred) initial[id] = preferred;
        });
        return initial;
    });

    useEffect(() => {
        setSelectedFormats((previous) => {
            let changed = false;
            const next: Record<string, MediaFormat> = { ...previous };

            itemIds.forEach((itemId) => {
                const selectorFormats = getSelectorFormatsForItem(itemId);
                if (selectorFormats.length === 0) {
                    if (next[itemId]) {
                        delete next[itemId];
                        changed = true;
                    }
                    return;
                }

                const current = next[itemId];
                const matchesCurrent = current
                    ? selectorFormats.some((format) => `${getMediaFormatIdentity(format)}|${format.url}` === `${getMediaFormatIdentity(current)}|${current.url}`)
                    : false;

                if (!matchesCurrent) {
                    next[itemId] = selectorFormats[0];
                    changed = true;
                }
            });

            return changed ? next : previous;
        });
    }, [itemIds, getSelectorFormatsForItem]);

    const [selectedItemId, setSelectedItemId] = useState<string>(itemIds[0] || 'main');

    // File sizes from backend metadata
    const fileSizes = useMemo(() => {
        const sizes: Record<string, string> = {};
        for (const format of data.formats || []) {
            if (format.filesize && format.filesize > 0) {
                const itemId = format.itemId || 'main';
                const key = `${itemId}-${format.url}`;
                sizes[key] = formatBytes(format.filesize);
            }
        }
        return sizes;
    }, [data.formats]);

    const getFormatSize = (itemId: string, format: MediaFormat): string | null => {
        if (!format?.url) return null;
        let size: string | null = null;
        if (format.filesize) {
            size = formatBytes(format.filesize);
        } else {
            const key = `${itemId}-${format.url}`;
            size = fileSizes[key] || null;
        }
        return size && format.needsMerge ? `~${size}` : size;
    };

    const isOverSizeLimit = (format: MediaFormat | undefined): boolean => {
        if (!format) return false;
        return (format.filesize || 0) > MAX_FILESIZE_BYTES;
    };

    // Download sync with global store
    const { progress: syncProgress } = useDownloadSync(data.url);

    // Download action hook
    const {
        downloadStatus,
        downloadProgress,
        globalStatus,
        zipProgress,
        isAnyDownloading,
        sentToWebhook,
        triggerDownload,
        confirmCancelDownload,
        cancelAllProcesses,
        handleDownloadAll,
        handleDownloadAsZip,
        handleSendToWebhook,
    } = useDownloadAction({
        data,
        platform,
        groupedItems,
        itemIds,
        selectedFormats,
        itemThumbnails,
        displayAuthor: displayAuthor || undefined,
        isMultiItem,
        onDownloadComplete,
    });

    // Navigation guard — block navigation during downloads
    const blockNavigation = useCallback(async (): Promise<boolean> => {
        if (!isAnyDownloading) return true;

        let countdown = 4;

        const result = await lazySwal.fire({
            icon: 'warning',
            title: 'Download In Progress!',
            text: 'If you leave this page, the process will be cancelled. Are you sure?',
            showCancelButton: true,
            confirmButtonText: `Yes, Leave (${countdown})`,
            cancelButtonText: 'Stay Here',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--accent-primary)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            allowOutsideClick: false,
            allowEscapeKey: true,
            didOpen: () => {
                const confirmBtn = getCachedSwal()?.getConfirmButton() ?? null;
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.style.cursor = 'not-allowed';

                    const interval = setInterval(() => {
                        countdown--;
                        if (countdown > 0) {
                            confirmBtn.textContent = `Yes, Leave (${countdown})`;
                        } else {
                            confirmBtn.textContent = 'Yes, Leave';
                            confirmBtn.disabled = false;
                            confirmBtn.style.opacity = '1';
                            confirmBtn.style.cursor = 'pointer';
                            clearInterval(interval);
                        }
                    }, 1000);
                }
            }
        });

        if (result.isConfirmed) {
            cancelAllProcesses();
        }

        return result.isConfirmed;
    }, [isAnyDownloading, cancelAllProcesses]);

    useNavigationGuard({
        isActive: isAnyDownloading,
        onConfirmLeave: blockNavigation,
        pasteBlockMessage: 'Please wait for the download to finish before pasting a new URL.',
        popstateBlockMessage: 'Please wait for the process to finish before leaving the page.',
    });

    // Response JSON modal
    const responseJsonText = useMemo(() => {
        try {
            return JSON.stringify(responseJson ?? data, null, 2);
        } catch {
            return JSON.stringify({ error: 'Unable to serialize response JSON' }, null, 2);
        }
    }, [responseJson, data]);

    const handleCopyResponse = useCallback(async () => {
        if (!navigator.clipboard?.writeText) {
            const { toast } = await import('sonner');
            toast.error('Copy is not supported in this browser.');
            return;
        }

        try {
            await navigator.clipboard.writeText(responseJsonText);
            const { toast } = await import('sonner');
            toast.success('Response Copied');
        } catch {
            const { toast } = await import('sonner');
            toast.error('Failed to copy response JSON.');
        }
    }, [responseJsonText]);

    // Format selector renderer
    const renderFormatButtons = (itemFormats: MediaFormat[], itemId: string) => (
        <div className="flex flex-col gap-2">
            {(() => {
                const selectorFormats = buildSelectorFormats(itemFormats, platform, includeSyntheticAudio);
                return (
                    <FormatSelector
                        formats={selectorFormats}
                        selected={selectedFormats[itemId] || null}
                        onSelect={(format) => setSelectedFormats(prev => ({ ...prev, [itemId]: format }))}
                        getSize={(f) => getFormatSize(itemId, f)}
                        platform={platform}
                    />
                );
            })()}
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-3 sm:p-4 overflow-hidden shiny-border"
        >
            {/* Header */}
            <div className="mb-3 sm:mb-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="flex-1 min-w-0 text-sm sm:text-base font-semibold text-[var(--text-primary)] line-clamp-1 break-words">{data.title}</h3>
                    <div className="flex items-center justify-end gap-1.5 flex-shrink-0 flex-wrap max-w-[45%]">
                        {data.responseTime && (
                            <button
                                type="button"
                                onClick={() => setShowResponseJsonModal(true)}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                                title="View response JSON"
                            >
                                ⚡ {data.responseTime}ms
                            </button>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${data.usedCookie
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>
                            {data.usedCookie ? t('withCookie') : t('guest')}
                        </span>
                    </div>
                </div>
                <div className="space-y-1.5">
                    {hasAuthorMeta && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] min-w-0 flex-wrap">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="font-medium text-[var(--text-primary)] min-w-0 truncate max-w-full">{displayAuthor || 'Unknown'}</span>
                            {normalizedAuthorHandle && (
                                <span className="text-[var(--text-muted)] min-w-0 truncate max-w-full">{normalizedAuthorHandle}</span>
                            )}
                        </div>
                    )}
                    {data.engagement && (
                        <EngagementDisplay engagement={data.engagement} className="text-[11px] text-[var(--text-muted)]" />
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-[var(--text-secondary)]">
                        {data.views && (<span className="flex items-center gap-1"><Eye className="w-3 h-3" />{data.views}</span>)}
                        {isMultiItem && (<span className="flex items-center gap-1 text-[var(--accent-primary)]"><LayersIcon className="w-3 h-3" />{itemIds.length} {t('items')}</span>)}
                    </div>
                </div>
                {data.description && (
                    <div className="mt-3 pt-2 border-t border-[var(--border-color)]/60">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                            {t('descriptionTitle')}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 break-words [overflow-wrap:anywhere] max-w-full">
                            {data.description.length > 150
                                ? data.description.replace(/\n+/g, ' ').substring(0, 150) + '...'
                                : data.description.replace(/\n+/g, ' ')
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Content */}
            {isMultiItem ? (
                <div className="space-y-4">
                    {/* Thumbnail grid */}
                    <div className="flex flex-wrap gap-1.5 overflow-hidden">
                        {itemIds.map((itemId, index) => {
                            const thumbnail = itemThumbnails[itemId] || data.thumbnail;
                            const isSelected = selectedItemId === itemId;
                            const itemFormats = groupedItems[itemId] || [];
                            const qualityBadge = getQualityBadge(itemFormats);
                            const isVideo = itemFormats.some(f => f.type === 'video');
                            return (
                                <button key={itemId} onClick={() => setSelectedItemId(itemId)}
                                    className={`relative aspect-square w-14 sm:w-16 rounded-lg overflow-hidden border-2 transition-all ${isSelected
                                        ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                                        : 'border-[var(--border-color)] hover:border-[var(--accent-primary)] opacity-60 hover:opacity-100'}`}>
                                    {thumbnail ? (
                                        <LazyThumbnail src={thumbnail} alt={`#${index + 1}`} platform={platform} eager={index < 10} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)]">
                                            <Play className="w-4 h-4 text-[var(--text-muted)]" />
                                        </div>
                                    )}
                                    <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">{index + 1}</div>
                                    {qualityBadge && (
                                        <div className={`absolute top-0.5 right-0.5 px-1 py-0.5 rounded text-[8px] font-bold ${
                                            qualityBadge === '4K' || qualityBadge === 'FHD'
                                                ? 'bg-purple-500/90 text-white'
                                                : qualityBadge === 'HD'
                                                    ? 'bg-blue-500/90 text-white'
                                                    : 'bg-gray-500/90 text-white'
                                        }`}>
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
                        })}
                    </div>

                    {/* Selected item preview */}
                    <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] min-w-0 overflow-hidden">
                        <div className="flex flex-col gap-2 w-full sm:w-28 md:w-36 flex-shrink-0">
                            <div
                                className="relative w-full aspect-video rounded-lg overflow-hidden bg-[var(--bg-primary)] cursor-pointer group"
                                onClick={() => {
                                    setGalleryInitialIndex(itemIds.indexOf(selectedItemId));
                                    setShowGallery(true);
                                }}
                            >
                                {itemThumbnails[selectedItemId] ? (
                                    <Image src={getProxiedThumbnail(itemThumbnails[selectedItemId], platform)} alt="Preview" fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Play className="w-8 h-8 text-[var(--text-muted)]" /></div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                            {renderFormatButtons(groupedItems[selectedItemId], selectedItemId)}
                            <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                                <Button size="xs" variant="secondary" onClick={() => {
                                    setGalleryInitialIndex(itemIds.indexOf(selectedItemId));
                                    setShowGallery(true);
                                }}
                                    leftIcon={<Maximize2 className="w-3.5 h-3.5" />}>
                                    Preview
                                </Button>
                                <Button size="xs" variant="secondary" onClick={() => {
                                    const format = selectedFormats[selectedItemId] || groupedItems[selectedItemId]?.[0];
                                    if (format) handleSendToWebhook(format, selectedItemId);
                                }}
                                    disabled={sentToWebhook[selectedItemId]}
                                    leftIcon={sentToWebhook[selectedItemId] ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" /> : <Send className="w-3.5 h-3.5" />}>
                                    {sentToWebhook[selectedItemId] ? t('sent') : t('discord')}
                                </Button>
                                {downloadStatus[selectedItemId] === 'downloading' ? (
                                    <div className="downaria-downloading-row">
                                        <Button
                                            size="xs"
                                            variant="secondary"
                                            disabled
                                            leftIcon={<Loader2 className="animate-spin w-3.5 h-3.5" />}
                                        >
                                            Downloading...
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="secondary"
                                            onClick={() => confirmCancelDownload(selectedItemId)}
                                            className="downaria-cancel-btn"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <SplitButton
                                        label={isOverSizeLimit(selectedFormats[selectedItemId] || groupedItems[selectedItemId]?.[0])
                                            ? 'Too large'
                                            : downloadStatus[selectedItemId] === 'success'
                                                ? t('done')
                                                : 'Download'}
                                        icon={<Download className="w-3.5 h-3.5" />}
                                        onMainClick={() => {
                                            const format = selectedFormats[selectedItemId] || groupedItems[selectedItemId]?.[0];
                                            if (format) triggerDownload(format, selectedItemId);
                                        }}
                                        disabled={isOverSizeLimit(selectedFormats[selectedItemId] || groupedItems[selectedItemId]?.[0]) || globalStatus === 'downloading'}
                                        size="xs"
                                        variant="primary"
                                        options={[
                                            {
                                                id: 'download-selected',
                                                label: t('downloadSelected'),
                                                description: 'Selected format',
                                                icon: <Download className="w-4 h-4" />,
                                                onClick: () => {
                                                    const format = selectedFormats[selectedItemId] || groupedItems[selectedItemId]?.[0];
                                                    if (format) triggerDownload(format, selectedItemId);
                                                },
                                            },
                                            {
                                                id: 'download-all',
                                                label: t('downloadAllOption'),
                                                description: `${itemIds.length} files, sequential`,
                                                icon: <Download className="w-4 h-4" />,
                                                onClick: handleDownloadAll,
                                            },
                                            {
                                                id: 'download-zip',
                                                label: t('downloadZip'),
                                                description: `Bundle all ${itemIds.length} files`,
                                                icon: <Archive className="w-4 h-4" />,
                                                onClick: handleDownloadAsZip,
                                            },
                                        ]}
                                    />
                                )}
                            </div>
                            {zipProgress && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span className="truncate">{zipProgress.status}</span>
                                    <span className="ml-auto">{zipProgress.current}/{zipProgress.total}</span>
                                </div>
                            )}
                            {downloadStatus[selectedItemId] === 'downloading' && downloadProgress[selectedItemId] && (
                                <DownloadProgress
                                    progress={{
                                        percent: downloadProgress[selectedItemId]?.percent || 0,
                                        loaded: downloadProgress[selectedItemId]?.loaded || 0,
                                        total: downloadProgress[selectedItemId]?.total || 0,
                                        speed: downloadProgress[selectedItemId]?.speed || 0,
                                        status: 'downloading',
                                        message: downloadProgress[selectedItemId]?.message
                                    }}
                                    className="mt-3"
                                />
                            )}
                        </div>
                    </div>

                </div>
            ) : (
                /* Single item */
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 min-w-0 overflow-hidden">
                    <div className="flex flex-col gap-2 w-full sm:w-40 md:w-48 lg:w-64 flex-shrink-0">
                        <div
                            className="relative w-full aspect-video rounded-xl overflow-hidden bg-[var(--bg-secondary)] cursor-pointer group"
                            onClick={() => setShowGallery(true)}
                        >
                            {(itemThumbnails[itemIds[0]] || data.thumbnail) ? (
                                <Image src={getProxiedThumbnail(itemThumbnails[itemIds[0]] || data.thumbnail, platform)} alt={data.title || 'Preview'} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><Play className="w-12 h-12 text-[var(--text-muted)]" /></div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium">
                                    <Maximize2 className="w-4 h-4" />
                                    Preview
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                        {renderFormatButtons(groupedItems[itemIds[0]], itemIds[0])}
                        <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                            <Button size="xs" variant="secondary" onClick={() => {
                                setGalleryInitialIndex(0);
                                setShowGallery(true);
                            }}
                                leftIcon={<Maximize2 className="w-3.5 h-3.5" />}>
                                Preview
                            </Button>
                            <Button size="xs" variant="secondary" onClick={() => handleSendToWebhook(selectedFormats[itemIds[0]], itemIds[0])}
                                disabled={sentToWebhook[itemIds[0]]}
                                leftIcon={sentToWebhook[itemIds[0]] ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" /> : <Send className="w-3.5 h-3.5" />}>
                                {sentToWebhook[itemIds[0]] ? t('sent') : t('discord')}
                            </Button>
                            {downloadStatus[itemIds[0]] === 'downloading' ? (
                                <div className="downaria-downloading-row">
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        disabled
                                        leftIcon={<Loader2 className="animate-spin w-3.5 h-3.5" />}
                                    >
                                        Downloading...
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        onClick={() => confirmCancelDownload(itemIds[0])}
                                        className="downaria-cancel-btn"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button size="xs" onClick={() => triggerDownload(selectedFormats[itemIds[0]], itemIds[0])}
                                    disabled={isOverSizeLimit(selectedFormats[itemIds[0]])}
                                    title={isOverSizeLimit(selectedFormats[itemIds[0]]) ? `File too large (max ${MAX_FILESIZE_LABEL} / ${MAX_FILESIZE_MB}MB)` : undefined}
                                    leftIcon={<Download className="w-3.5 h-3.5" />}>
                                    {isOverSizeLimit(selectedFormats[itemIds[0]])
                                        ? `Too large (max ${MAX_FILESIZE_LABEL})`
                                        : downloadStatus[itemIds[0]] === 'success' ? t('downloaded') : 'Download'}
                                </Button>
                            )}
                        </div>
                        {downloadStatus[itemIds[0]] === 'downloading' && downloadProgress[itemIds[0]] && (
                            <DownloadProgress
                                progress={{
                                    percent: downloadProgress[itemIds[0]]?.percent || 0,
                                    loaded: downloadProgress[itemIds[0]]?.loaded || 0,
                                    total: downloadProgress[itemIds[0]]?.total || 0,
                                    speed: downloadProgress[itemIds[0]]?.speed || 0,
                                    status: 'downloading',
                                    message: downloadProgress[itemIds[0]]?.message
                                }}
                                className="mt-3"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Media Gallery Modal */}
            <MediaGallery
                data={data}
                platform={platform}
                responseJson={responseJson}
                isOpen={showGallery}
                onClose={() => setShowGallery(false)}
                initialIndex={galleryInitialIndex}
                initialFormat={selectedFormats[selectedItemId] || null}
            />

            <Modal
                isOpen={showResponseJsonModal}
                onClose={() => setShowResponseJsonModal(false)}
                size="xl"
                title="Response JSON"
                showTitle
                bodyClassName="p-4"
                backdropClassName="response-json-backdrop z-[70]"
                panelClassName="response-json-modal-panel z-[71] max-w-2xl w-[min(92vw,860px)] rounded-2xl overflow-hidden"
                header={(
                    <>
                        <div className="relative">
                            <TrafficLights onClose={() => setShowResponseJsonModal(false)} title="Response JSON" />
                            <button
                                type="button"
                                onClick={() => setShowResponseJsonModal(false)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <span>Hide</span>
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="px-6 pt-4 flex items-center justify-between gap-3">
                            <h2 id="modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
                                Response JSON
                            </h2>
                            <button
                                type="button"
                                onClick={handleCopyResponse}
                                className="inline-flex items-center rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                            >
                                Copy response
                            </button>
                        </div>
                    </>
                )}
            >
                <pre className="max-h-[60vh] overflow-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                    {responseJsonText}
                </pre>
            </Modal>

            {/* Global Size Limit Warning */}
            <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>Download Limit: Max {MAX_FILESIZE_LABEL} per file. Choose a lower quality if the file is too large.</span>
            </div>
        </motion.div>
    );
}
