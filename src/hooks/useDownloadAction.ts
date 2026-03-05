'use client';

import { useState, useCallback, useRef } from 'react';
import { MediaData, MediaFormat, PlatformId } from '@/lib/types';
import { type HistoryEntry } from '@/lib/storage';
import { sendDiscordNotification, getUserDiscordSettings } from '@/lib/utils/discord-webhook';
import { formatBytes } from '@/lib/utils/format';
import { getProxyUrl } from '@/lib/api/proxy';
import { lazySwal, getCachedSwal } from '@/lib/utils/lazy-swal';
import { toast } from 'sonner';
import { MAX_FILESIZE_BYTES, MAX_FILESIZE_LABEL } from '@/lib/constants/download-limits';
import {
    setDownloadProgress as setGlobalDownloadProgress,
} from '@/lib/stores/download-store';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type DownloadStatus = 'idle' | 'downloading' | 'success' | 'error';

export interface ProgressInfo {
    loaded: number;
    total: number;
    percent: number;
    speed: number;
    message?: string;
}

export interface ZipProgress {
    current: number;
    total: number;
    status: string;
}

export interface UseDownloadActionOptions {
    data: MediaData;
    platform: PlatformId;
    groupedItems: Record<string, MediaFormat[]>;
    itemIds: string[];
    selectedFormats: Record<string, MediaFormat>;
    itemThumbnails: Record<string, string>;
    displayAuthor?: string;
    isMultiItem?: boolean;
    onDownloadComplete?: (entry: HistoryEntry) => void;
}

export interface UseDownloadActionReturn {
    downloadStatus: Record<string, DownloadStatus>;
    downloadProgress: Record<string, ProgressInfo>;
    globalStatus: DownloadStatus;
    zipProgress: ZipProgress | null;
    isAnyDownloading: boolean;
    sentToWebhook: Record<string, boolean>;
    triggerDownload: (format: MediaFormat, itemId: string) => Promise<void>;
    cancelDownload: (itemId: string) => void;
    confirmCancelDownload: (itemId: string) => Promise<void>;
    cancelAllProcesses: () => void;
    handleDownloadAll: () => Promise<void>;
    handleDownloadAsZip: () => Promise<void>;
    handleSendToWebhook: (format: MediaFormat, itemId: string) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useDownloadAction({
    data,
    platform,
    groupedItems,
    itemIds,
    selectedFormats,
    itemThumbnails,
    displayAuthor,
    isMultiItem = false,
    onDownloadComplete,
}: UseDownloadActionOptions): UseDownloadActionReturn {
    const [downloadStatus, setDownloadStatus] = useState<Record<string, DownloadStatus>>({});
    const [downloadProgress, setDownloadProgress] = useState<Record<string, ProgressInfo>>({});
    const [globalStatus, setGlobalStatus] = useState<DownloadStatus>('idle');
    const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
    const [sentToWebhook, setSentToWebhook] = useState<Record<string, boolean>>({});

    const abortControllersRef = useRef<Record<string, AbortController>>({});

    const isAnyDownloading = Object.values(downloadStatus).some(s => s === 'downloading') || globalStatus === 'downloading';

    // Cancel specific download by itemId
    const cancelDownload = useCallback((itemId: string) => {
        const controller = abortControllersRef.current[itemId];
        if (controller) {
            controller.abort();
            delete abortControllersRef.current[itemId];
        }

        setDownloadStatus(prev => ({ ...prev, [itemId]: 'idle' }));
        setDownloadProgress(prev => {
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
    }, []);

    // Cancel with confirmation dialog
    const confirmCancelDownload = useCallback(async (itemId: string) => {
        const result = await lazySwal.fire({
            icon: 'warning',
            title: 'Cancel Download?',
            text: 'The download/merge process on the server will be stopped. Continue?',
            showCancelButton: true,
            confirmButtonText: 'Yes, Cancel',
            cancelButtonText: 'Continue Download',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--accent-primary)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
        });

        if (result.isConfirmed) {
            cancelDownload(itemId);
        }
    }, [cancelDownload]);

    // Cancel all ongoing downloads
    const cancelAllProcesses = useCallback(() => {
        Object.keys(abortControllersRef.current).forEach(itemId => {
            cancelDownload(itemId);
        });
        setGlobalStatus('idle');
    }, [cancelDownload]);

    // Core download function
    const triggerDownload = useCallback(async (format: MediaFormat, itemId: string) => {
        const abortController = new AbortController();
        abortControllersRef.current[itemId] = abortController;

        setDownloadStatus(prev => ({ ...prev, [itemId]: 'downloading' }));
        setDownloadProgress(prev => ({ ...prev, [itemId]: { loaded: 0, total: 0, percent: 0, speed: 0 } }));
        setGlobalDownloadProgress(data.url, { status: 'downloading', percent: 0, loaded: 0, total: 0, speed: 0 });

        try {
            const { downloadMedia, triggerBlobDownload } = await import('@/lib/utils/media');
            const carouselIndex = isMultiItem && itemId !== 'main' ? itemIds.indexOf(itemId) + 1 : undefined;

            const result = await downloadMedia(format, data, platform, carouselIndex, (progress) => {
                setDownloadProgress(prev => ({
                    ...prev,
                    [itemId]: {
                        loaded: progress.loaded,
                        total: progress.total,
                        percent: progress.percent,
                        speed: progress.speed,
                        message: progress.message,
                    }
                }));
                setGlobalDownloadProgress(data.url, {
                    status: progress.status === 'done' ? 'done' : progress.status === 'error' ? 'error' : 'downloading',
                    percent: progress.percent,
                    loaded: progress.loaded,
                    total: progress.total,
                    speed: progress.speed,
                    message: progress.message,
                });
            }, abortController.signal);

            if (!result.success) {
                throw new Error(result.error || 'Download failed');
            }

            if (result.blob && result.filename) {
                triggerBlobDownload(result.blob, result.filename);
            }

            if (onDownloadComplete) {
                onDownloadComplete({
                    id: '',
                    platform,
                    contentId: data.url,
                    resolvedUrl: data.url,
                    title: data.title || 'Untitled',
                    thumbnail: itemThumbnails[itemId] || data.thumbnail || '',
                    author: displayAuthor || 'Unknown',
                    downloadedAt: Date.now(),
                    quality: format.quality,
                    type: format.type,
                });
            }

            // Send Discord notification (auto, not manual)
            if (!sentToWebhook[itemId]) {
                sendDiscordNotification({
                    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                    title: data.title || result.filename || 'Download',
                    quality: format.quality,
                    thumbnail: itemThumbnails[itemId] || data.thumbnail,
                    mediaUrl: format.url,
                    mediaType: format.type,
                    sourceUrl: data.url,
                    author: data.author,
                    fileSize: format.filesize || 0,
                });
                setSentToWebhook(prev => ({ ...prev, [itemId]: true }));
            }

            setDownloadStatus(prev => ({ ...prev, [itemId]: 'success' }));
            setGlobalDownloadProgress(data.url, { status: 'done', percent: 100, loaded: 0, total: 0, speed: 0 });

            delete abortControllersRef.current[itemId];

            setTimeout(() => {
                setDownloadStatus(prev => ({ ...prev, [itemId]: 'idle' }));
                setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
            }, 5000);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Download failed';
            if (!/cancelled/i.test(errorMessage)) {
                toast.error(errorMessage);
            }

            setDownloadStatus(prev => ({ ...prev, [itemId]: 'error' }));
            setGlobalDownloadProgress(data.url, { status: 'error', percent: 0, loaded: 0, total: 0, speed: 0 });

            delete abortControllersRef.current[itemId];

            setTimeout(() => {
                setDownloadStatus(prev => ({ ...prev, [itemId]: 'idle' }));
                setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
            }, 5000);
        }
    }, [data, platform, itemIds, isMultiItem, itemThumbnails, displayAuthor, onDownloadComplete, sentToWebhook]);

    // Download all items sequentially
    const handleDownloadAll = useCallback(async () => {
        setGlobalStatus('downloading');
        let isFirstItem = true;
        for (const id of itemIds) {
            const format = selectedFormats[id] || groupedItems[id]?.[0];
            if (format) {
                try {
                    if (!isFirstItem && !sentToWebhook[id]) {
                        setSentToWebhook(prev => ({ ...prev, [id]: true }));
                    }
                    await triggerDownload(format, id);
                    isFirstItem = false;
                    await new Promise(r => setTimeout(r, 500));
                } catch { /* skip failed */ }
            }
        }
        setGlobalStatus('idle');
    }, [itemIds, selectedFormats, groupedItems, triggerDownload, sentToWebhook]);

    // Download all items as ZIP
    const handleDownloadAsZip = useCallback(async () => {
        // Check for oversized files
        const oversizedItems: string[] = [];
        for (const id of itemIds) {
            const format = selectedFormats[id] || groupedItems[id]?.[0];
            if (format && format.filesize && format.filesize > MAX_FILESIZE_BYTES) {
                oversizedItems.push(`#${itemIds.indexOf(id) + 1} (${formatBytes(format.filesize)})`);
            }
        }

        if (oversizedItems.length > 0) {
            const result = await lazySwal.fire({
                icon: 'warning',
                title: 'Some Files Too Large',
                html: `The following items exceed ${MAX_FILESIZE_LABEL} and will be skipped:<br><br><b>${oversizedItems.slice(0, 5).join(', ')}${oversizedItems.length > 5 ? ` +${oversizedItems.length - 5} more` : ''}</b><br><br>Continue with remaining files?`,
                showCancelButton: true,
                confirmButtonText: 'Continue',
                cancelButtonText: 'Cancel',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
            });
            if (!result.isConfirmed) return;
        }

        setGlobalStatus('downloading');
        setZipProgress({ current: 0, total: itemIds.length, status: 'Preparing...' });

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const folder = zip.folder(data.title?.substring(0, 50).replace(/[<>:"/\\|?*]/g, '_') || 'download');
        if (!folder) {
            setGlobalStatus('idle');
            setZipProgress(null);
            return;
        }

        let downloaded = 0;
        let failed = 0;
        let skipped = 0;
        const CONCURRENT_DOWNLOADS = 5;

        for (let i = 0; i < itemIds.length; i += CONCURRENT_DOWNLOADS) {
            const batch = itemIds.slice(i, i + CONCURRENT_DOWNLOADS);

            await Promise.all(batch.map(async (id, batchIdx) => {
                const format = selectedFormats[id] || groupedItems[id]?.[0];
                if (!format) return;

                // Skip oversized files
                if (format.filesize && format.filesize > MAX_FILESIZE_BYTES) {
                    skipped++;
                    return;
                }

                const idx = i + batchIdx + 1;
                setZipProgress({ current: idx, total: itemIds.length, status: `Downloading ${idx}/${itemIds.length}...` });

                try {
                    const proxyUrl = getProxyUrl(format.url, { platform });
                    const response = await fetch(proxyUrl);

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const blob = await response.blob();
                    const ext = format.type === 'video' ? 'mp4' :
                               format.type === 'audio' ? 'mp3' :
                               format.url.split('.').pop()?.split('?')[0] || 'jpg';
                    const safeTitle = (data.title || '').substring(0, 80).replace(/[<>:"/\\|?*]/g, '_').trim();
                    const safeAuthor = (data.authorUsername || data.author || '').substring(0, 30).replace(/[<>:"/\\|?*]/g, '_').trim();
                    const prefix = safeAuthor ? `${safeAuthor}_` : '';
                    const titlePart = safeTitle ? `${safeTitle}_` : '';
                    const filename = `${prefix}${titlePart}${String(idx).padStart(2, '0')}_[DownAria].${ext}`;

                    folder.file(filename, blob);
                    downloaded++;
                } catch (err) {
                    console.error(`Failed to download item ${idx}:`, err);
                    failed++;
                }
            }));
        }

        if (downloaded === 0) {
            toast.error('Could not download any files. Please try again.');
            setGlobalStatus('idle');
            setZipProgress(null);
            return;
        }

        setZipProgress({ current: itemIds.length, total: itemIds.length, status: 'Creating ZIP...' });

        try {
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            }, (metadata) => {
                setZipProgress({
                    current: itemIds.length,
                    total: itemIds.length,
                    status: `Compressing... ${Math.round(metadata.percent)}%`
                });
            });

            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.title?.substring(0, 50).replace(/[<>:"/\\|?*]/g, '_') || 'download'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (failed > 0 || skipped > 0) {
                toast.warning(`Downloaded ${downloaded} files.${failed > 0 ? ` ${failed} failed.` : ''}${skipped > 0 ? ` ${skipped} skipped (>${MAX_FILESIZE_LABEL}).` : ''}`);
            }
        } catch (err) {
            console.error('ZIP creation failed:', err);
            toast.error('Failed to create ZIP file.');
        }

        setGlobalStatus('idle');
        setZipProgress(null);
    }, [data, platform, itemIds, selectedFormats, groupedItems]);

    // Send to Discord webhook (manual)
    const handleSendToWebhook = useCallback(async (format: MediaFormat, itemId: string) => {
        const settings = getUserDiscordSettings();
        if (!settings?.webhookUrl) {
            void lazySwal.fire({
                icon: 'warning',
                title: 'Webhook Not Configured',
                text: 'Please configure Discord webhook in Settings first.',
                confirmButtonText: 'Go to Settings',
                showCancelButton: true,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                confirmButtonColor: 'var(--accent-primary)',
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/settings';
                }
            });
            return;
        }

        const thumbnail = itemThumbnails[itemId] || data.thumbnail;

        const sendResult = await sendDiscordNotification({
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            title: data.title || 'Untitled',
            quality: format.quality,
            thumbnail,
            mediaUrl: format.url,
            mediaType: format.type,
            sourceUrl: data.url,
            author: data.author,
            engagement: data.engagement,
            fileSize: format.filesize || 0,
        }, true);

        if (sendResult.sent) {
            setSentToWebhook(prev => ({ ...prev, [itemId]: true }));
            toast.success('Sent to Discord');
        } else if (sendResult.reason !== 'cancelled') {
            toast.error(sendResult.details ?? 'Failed to send to Discord');
        }
    }, [data, platform, itemThumbnails]);

    return {
        downloadStatus,
        downloadProgress,
        globalStatus,
        zipProgress,
        isAnyDownloading,
        sentToWebhook,
        triggerDownload,
        cancelDownload,
        confirmCancelDownload,
        cancelAllProcesses,
        handleDownloadAll,
        handleDownloadAsZip,
        handleSendToWebhook,
    };
}
