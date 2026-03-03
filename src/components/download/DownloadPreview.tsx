'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { type HistoryEntry, getUnifiedSettings } from '@/lib/storage';
import { LayersIcon, CheckCircleIcon } from '@/components/ui/Icons';
import { sendDiscordNotification, getUserDiscordSettings } from '@/lib/utils/discord-webhook';
import { formatBytes } from '@/lib/utils/format';
import { getProxiedThumbnail } from '@/lib/api/proxy';
import { getProxyUrl } from '@/lib/api/proxy';
import { useTranslations } from 'next-intl';
import { MediaGallery } from '@/components/media';
import Swal from 'sweetalert2';
import JSZip from 'jszip';
// Shared utilities
import {
    groupFormatsByItem,
    getDisplayFormatsForPlatform,
    getMediaFormatIdentity,
    getItemThumbnails,
    findPreferredFormat,
    getQualityBadge,
    buildSelectorFormats,
} from '@/lib/utils/media';
// Shared download store
import { 
    setDownloadProgress as setGlobalDownloadProgress,
    subscribeDownloadProgress,
    getDownloadProgress,
} from '@/lib/stores/download-store';

// Global filesize limit for all platforms (1GB)
const MAX_FILESIZE_MB = 1024;
const MAX_FILESIZE_LABEL = '1GB';
const MAX_FILESIZE_BYTES = MAX_FILESIZE_MB * 1024 * 1024;

import { EngagementDisplay } from '@/components/media/EngagementDisplay';
import { FormatSelector } from '@/components/media/FormatSelector';
import { DownloadProgress } from '@/components/media/DownloadProgress';
import { SplitButton } from '@/components/ui/SplitButton';
import { Modal } from '@/components/ui/Modal';
import { TrafficLights } from '@/components/ui/TrafficLights';

// ═══════════════════════════════════════════════════════════════
// LAZY THUMBNAIL WITH QUEUE - Max 10 concurrent, retry on fail
// ═══════════════════════════════════════════════════════════════

// Global queue for thumbnail loading
const thumbnailQueue: Array<() => void> = [];
let activeLoads = 0;
const MAX_CONCURRENT = 10;

function processQueue() {
    while (activeLoads < MAX_CONCURRENT && thumbnailQueue.length > 0) {
        const next = thumbnailQueue.shift();
        if (next) {
            activeLoads++;
            next();
        }
    }
}

function queueThumbnailLoad(loadFn: () => Promise<void>): void {
    thumbnailQueue.push(() => {
        loadFn().finally(() => {
            activeLoads--;
            processQueue();
        });
    });
    processQueue();
}

interface LazyThumbnailProps {
    src: string;
    alt: string;
    platform: PlatformId;
    className?: string;
    eager?: boolean; // Load immediately without queue
}

function LazyThumbnail({ src, alt, platform, className = '', eager = false }: LazyThumbnailProps) {
    const [isVisible, setIsVisible] = useState(eager);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [shouldLoad, setShouldLoad] = useState(eager);
    const ref = useRef<HTMLDivElement>(null);
    const MAX_RETRIES = 3;

    // IntersectionObserver for lazy loading
    useEffect(() => {
        if (eager) return;
        
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [eager]);

    // Queue the load when visible
    useEffect(() => {
        if (!isVisible || shouldLoad) return;
        
        queueThumbnailLoad(async () => {
            setShouldLoad(true);
        });
    }, [isVisible, shouldLoad]);

    const handleLoad = () => {
        setIsLoaded(true);
        setHasError(false);
    };

    const handleError = () => {
        if (retryCount < MAX_RETRIES) {
            // Retry after delay
            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setHasError(false);
            }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s, 3s
        } else {
            setHasError(true);
        }
    };

    const proxiedSrc = getProxiedThumbnail(src, platform);
    // Add retry param to bust cache on retry
    const srcWithRetry = retryCount > 0 ? `${proxiedSrc}&_retry=${retryCount}` : proxiedSrc;

    return (
        <div ref={ref} className="relative w-full h-full">
            {shouldLoad && !hasError ? (
                <>
                    {!isLoaded && (
                        <div className="absolute inset-0 bg-[var(--bg-secondary)] flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
                        </div>
                    )}
                    <Image
                        key={retryCount} // Force remount on retry
                        src={srcWithRetry}
                        alt={alt}
                        fill
                        className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
                        unoptimized
                        onLoad={handleLoad}
                        onError={handleError}
                    />
                </>
            ) : hasError ? (
                <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center">
                    <span className="text-[10px] text-[var(--text-muted)]">!</span>
                </div>
            ) : (
                <div className="w-full h-full bg-[var(--bg-secondary)]" />
            )}
        </div>
    );
}

interface DownloadPreviewProps {
    data: MediaData;
    platform: PlatformId;
    responseJson?: unknown;
    onDownloadComplete?: (entry: HistoryEntry) => void;
}

type DownloadStatus = 'idle' | 'downloading' | 'success' | 'error';

export function DownloadPreview({ data, platform, responseJson, onDownloadComplete }: DownloadPreviewProps) {
    const [downloadStatus, setDownloadStatus] = useState<Record<string, DownloadStatus>>({});
    const [downloadProgress, setDownloadProgress] = useState<Record<string, { loaded: number; total: number; percent: number; speed: number; message?: string }>>({});
    const [fileSizes, setFileSizes] = useState<Record<string, string>>({});
    const [fileSizeNumerics, setFileSizeNumerics] = useState<Record<string, number>>({});
    const [globalStatus, setGlobalStatus] = useState<DownloadStatus>('idle');
    const [showGallery, setShowGallery] = useState(false);
    const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
    const [showResponseJsonModal, setShowResponseJsonModal] = useState(false);
    
    // AbortController for cancelling downloads
    const abortControllersRef = useRef<Record<string, AbortController>>({});
    const hasPushedGuardStateRef = useRef(false);
    
    const t = useTranslations('download.preview');
    const responseJsonText = useMemo(() => {
        try {
            return JSON.stringify(responseJson ?? data, null, 2);
        } catch {
            return JSON.stringify({ error: 'Unable to serialize response JSON' }, null, 2);
        }
    }, [responseJson, data]);

    const handleCopyResponse = useCallback(async () => {
        if (!navigator.clipboard?.writeText) {
            Swal.fire({
                icon: 'error',
                title: 'Clipboard Unavailable',
                text: 'Copy is not supported in this browser.',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                confirmButtonColor: 'var(--accent-primary)',
            });
            return;
        }

        try {
            await navigator.clipboard.writeText(responseJsonText);
            Swal.fire({
                icon: 'success',
                title: 'Response Copied',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1800,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
            });
        } catch {
            Swal.fire({
                icon: 'error',
                title: 'Copy Failed',
                text: 'Failed to copy response JSON.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2600,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
            });
        }
    }, [responseJsonText]);

    // Safety check - if no data or no formats, show nothing
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

    // Group formats by itemId using shared utilities
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
        ? authorHandle.startsWith('@')
            ? authorHandle
            : `@${authorHandle}`
        : null;
    const displayAuthor = data.author || data.authorAlias || normalizedAuthorHandle;
    const hasAuthorMeta = Boolean(displayAuthor || normalizedAuthorHandle);

    const getSelectorFormatsForItem = useCallback((itemId: string): MediaFormat[] => {
        const itemFormats = groupedItems[itemId] || [];
        return buildSelectorFormats(itemFormats, platform, true);
    }, [groupedItems, platform]);

    // State for selected format per item using shared utility
    const [selectedFormats, setSelectedFormats] = useState<Record<string, MediaFormat>>(() => {
        const initial: Record<string, MediaFormat> = {};
        itemIds.forEach(id => {
            const preferred = findPreferredFormat(buildSelectorFormats(groupedItems[id] || [], platform, true));
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

    // State for selected item
    const [selectedItemId, setSelectedItemId] = useState<string>(itemIds[0] || 'main');

    // State for webhook sent tracking
    const [sentToWebhook, setSentToWebhook] = useState<Record<string, boolean>>({});
    
    // Track if sizes have been fetched for current data
    const [sizesFetched, setSizesFetched] = useState(false);

    // Keep settings read for compatibility with existing app settings hydration
    useEffect(() => {
        void getUnifiedSettings();
    }, []);


    // Reset sizesFetched when data changes
    useEffect(() => {
        setSizesFetched(false);
        setFileSizes({});
        setFileSizeNumerics({});
    }, [data.url]); // Reset when URL changes (new content)

    // Sync with global download store - subscribe to updates from MediaGallery
    useEffect(() => {
        const unsubscribe = subscribeDownloadProgress(data.url, (progress) => {
            // Map global progress to local state format
            const status: DownloadStatus = 
                progress.status === 'downloading' ? 'downloading' :
                progress.status === 'done' ? 'success' :
                progress.status === 'error' ? 'error' : 'idle';
            
            // Update for 'main' item (single item) or current selected item
            const itemId = 'main';
            setDownloadStatus(prev => ({ ...prev, [itemId]: status }));
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
        });
        
        // Check initial state from store
        const initial = getDownloadProgress(data.url);
        if (initial.status !== 'idle') {
            const status: DownloadStatus = 
                initial.status === 'downloading' ? 'downloading' :
                initial.status === 'done' ? 'success' :
                initial.status === 'error' ? 'error' : 'idle';
            setDownloadStatus(prev => ({ ...prev, main: status }));
            setDownloadProgress(prev => ({
                ...prev,
                main: {
                    loaded: initial.loaded,
                    total: initial.total,
                    percent: initial.percent,
                    speed: initial.speed,
                    message: initial.message,
                }
            }));
        }
        
        return unsubscribe;
    }, [data.url]);

    // Check if any download OR conversion is in progress
    const isAnyDownloading = Object.values(downloadStatus).some(s => s === 'downloading') || globalStatus === 'downloading';

    // Cancel specific download by itemId
    const cancelDownload = useCallback((itemId: string) => {
        const controller = abortControllersRef.current[itemId];
        if (controller) {
            controller.abort();
            delete abortControllersRef.current[itemId];
        }
        
        // Reset status for this item only
        setDownloadStatus(prev => ({ ...prev, [itemId]: 'idle' }));
        setDownloadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[itemId];
            return newProgress;
        });
        
    }, []);

    const confirmCancelDownload = useCallback(async (itemId: string) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Batalkan Download?',
            text: 'Proses download/merge di server akan dihentikan. Lanjutkan?',
            showCancelButton: true,
            confirmButtonText: 'Ya, Batalkan',
            cancelButtonText: 'Lanjut Download',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--accent-primary)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
        });

        if (result.isConfirmed) {
            cancelDownload(itemId);
        }
    }, [cancelDownload]);

    // Cancel all ongoing downloads/conversions (for navigation blocking)
    const cancelAllProcesses = useCallback(() => {
        // Abort all ongoing fetch requests
        Object.keys(abortControllersRef.current).forEach(itemId => {
            cancelDownload(itemId);
        });
        
        // Reset global status
        setGlobalStatus('idle');
        
    }, [cancelDownload]);

    // Block navigation helper with SweetAlert + countdown
    const blockNavigation = useCallback(async (): Promise<boolean> => {
        if (!isAnyDownloading) return true; // Allow navigation
        
        let countdown = 4;
        
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Download Sedang Berjalan!',
            text: 'Jika kamu meninggalkan halaman, proses akan dibatalkan. Yakin mau keluar?',
            showCancelButton: true,
            confirmButtonText: `Ya, Keluar (${countdown})`,
            cancelButtonText: 'Tetap di Sini',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--accent-primary)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            allowOutsideClick: false,
            allowEscapeKey: true,
            didOpen: () => {
                const confirmBtn = Swal.getConfirmButton();
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.style.cursor = 'not-allowed';
                    
                    const interval = setInterval(() => {
                        countdown--;
                        if (countdown > 0) {
                            confirmBtn.textContent = `Ya, Keluar (${countdown})`;
                        } else {
                            confirmBtn.textContent = 'Ya, Keluar';
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
            // Cancel all ongoing processes before navigating
            cancelAllProcesses();
        }
        
        return result.isConfirmed;
    }, [isAnyDownloading, cancelAllProcesses]);

    // Block browser back/forward navigation during download
    useEffect(() => {
        if (!isAnyDownloading) return;

        // Push a guard state once to detect back button while downloading
        if (!hasPushedGuardStateRef.current) {
            window.history.pushState({ ...(window.history.state || {}), downloadInProgress: true }, '');
            hasPushedGuardStateRef.current = true;
        }

        const handlePopState = async () => {
            if (isAnyDownloading) {
                // Re-push state to stay on page
                window.history.pushState({ downloadInProgress: true }, '');
                
                // Show warning
                Swal.fire({
                    icon: 'warning',
                    title: 'Download Sedang Berjalan!',
                    text: 'Tunggu proses selesai sebelum meninggalkan halaman.',
                    toast: true,
                    position: 'top',
                    timer: 3000,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                });
            }
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
            // Cleanup without navigation: keep history intact, only clear marker
            if (window.history.state?.downloadInProgress) {
                const nextState = { ...(window.history.state || {}) } as Record<string, unknown>;
                delete nextState.downloadInProgress;
                window.history.replaceState(nextState, '');
            }
            hasPushedGuardStateRef.current = false;
        };
    }, [isAnyDownloading]);

    // Intercept link clicks during download
    useEffect(() => {
        if (!isAnyDownloading) return;

        const handleClick = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            
            if (link && link.href && !link.href.startsWith('blob:') && !link.download) {
                const isSameOrigin = link.href.startsWith(window.location.origin);
                
                if (isSameOrigin) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const shouldNavigate = await blockNavigation();
                    if (shouldNavigate) {
                        // User confirmed, allow navigation
                        window.location.href = link.href;
                    }
                }
            }
        };

        document.addEventListener('click', handleClick, true);
        return () => document.removeEventListener('click', handleClick, true);
    }, [isAnyDownloading, blockNavigation]);

    // Prevent paste during download (to avoid accidental new URL submission)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (isAnyDownloading) {
                e.preventDefault();
                Swal.fire({
                    icon: 'warning',
                    title: 'Download Sedang Berjalan',
                    text: 'Tunggu download selesai sebelum paste URL baru.',
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                });
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isAnyDownloading]);

    // Populate file sizes from backend JSON only (no frontend HEAD requests)
    useEffect(() => {
        const newSizes: Record<string, string> = {};
        const newNumerics: Record<string, number> = {};
        for (const format of data.formats || []) {
            if (format.filesize && format.filesize > 0) {
                const itemId = format.itemId || 'main';
                const key = `${itemId}-${format.url}`;
                newSizes[key] = formatBytes(format.filesize);
                newNumerics[key] = format.filesize;
            }
        }

        setFileSizes(newSizes);
        setFileSizeNumerics(newNumerics);
        setSizesFetched(true);
    }, [data.formats]);

    // Helper to get size for any format (not just selected)
    const getFormatSize = (itemId: string, format: MediaFormat): string | null => {
        if (!format?.url) return null;
        let size: string | null = null;
        // Use filesize from response if available (all platforms including YouTube)
        if (format.filesize) {
            size = formatBytes(format.filesize);
        } else {
            const key = `${itemId}-${format.url}`;
            size = fileSizes[key] || null;
        }
        // Add ~ prefix for estimated sizes (YouTube merge formats)
        return size && format.needsMerge ? `~${size}` : size;
    };

    // Check if format exceeds global size limit (400MB for all platforms)
    const isOverSizeLimit = (format: MediaFormat | undefined): boolean => {
        if (!format) return false;
        const size = format.filesize || 0;
        return size > MAX_FILESIZE_BYTES;
    };
    const activeDownloadLabel = 'Downloading...';

    // Send to webhook
    const handleSendToWebhook = async (format: MediaFormat, itemId: string) => {
        const settings = getUserDiscordSettings();
        if (!settings?.webhookUrl) {
            Swal.fire({
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

        // Get file size - prefer format.filesize (from backend), fallback to fetched size
        const sizeKey = `${itemId}-${format.url}`;
        const sizeBytes = format.filesize || fileSizeNumerics[sizeKey] || 0;

        // Delegate confirmation to sendDiscordNotification (which now has smart dialogs)
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
            fileSize: sizeBytes,
        }, true);

        if (sendResult.sent) {
            setSentToWebhook(prev => ({ ...prev, [itemId]: true }));
            Swal.fire({
                icon: 'success',
                title: 'Sent to Discord',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
            });
        } else if (sendResult.reason !== 'cancelled') {
            Swal.fire({
                icon: 'error',
                title: 'Failed to Send',
                text: sendResult.details,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
            });
        }
    };

    // Download function - uses unified helper
    const triggerDownload = async (format: MediaFormat, itemId: string) => {
        // Create AbortController for this download
        const abortController = new AbortController();
        abortControllersRef.current[itemId] = abortController;
        
        setDownloadStatus(prev => ({ ...prev, [itemId]: 'downloading' }));
        setDownloadProgress(prev => ({ ...prev, [itemId]: { loaded: 0, total: 0, percent: 0, speed: 0 } }));
        // Update global store for sync with MediaGallery
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
                // Update global store
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

            // Trigger browser download if we have a blob
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

            // Send Discord notification
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
            
            // Cleanup abort controller
            delete abortControllersRef.current[itemId];
            
            setTimeout(() => {
                setDownloadStatus(prev => ({ ...prev, [itemId]: 'idle' }));
                setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
            }, 5000);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Download failed';
            if (!/cancelled/i.test(errorMessage)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Download Failed',
                    text: errorMessage,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 4500,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                });
            }

            setDownloadStatus(prev => ({ ...prev, [itemId]: 'error' }));
            setGlobalDownloadProgress(data.url, { status: 'error', percent: 0, loaded: 0, total: 0, speed: 0 });
            
            // Cleanup abort controller
            delete abortControllersRef.current[itemId];
            
            setTimeout(() => {
                setDownloadStatus(prev => ({ ...prev, [itemId]: 'idle' }));
                setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
            }, 5000);
        }
    };

    // ZIP progress state
    const [zipProgress, setZipProgress] = useState<{ current: number; total: number; status: string } | null>(null);

    const handleDownloadAll = async () => {
        // Individual downloads (non-ZIP batch)
        setGlobalStatus('downloading');
        let isFirstItem = true;
        for (const id of itemIds) {
            const format = selectedFormats[id] || groupedItems[id]?.[0];
            if (format) {
                try {
                    // For Download All, only send Discord for first item (representative)
                    // Mark others as "sent" to prevent duplicate sends
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
    };

    const handleDownloadAsZip = async () => {
        // Check if any file exceeds 400MB limit
        const oversizedItems: string[] = [];
        for (const id of itemIds) {
            const format = selectedFormats[id] || groupedItems[id]?.[0];
            if (format) {
                const filesize = format.filesize || fileSizes[`${id}-${format.quality}`];
                const filesizeNum = typeof filesize === 'string' ? parseInt(filesize, 10) : filesize;
                if (filesizeNum && filesizeNum > MAX_FILESIZE_BYTES) {
                    oversizedItems.push(`#${itemIds.indexOf(id) + 1} (${formatBytes(filesizeNum)})`);
                }
            }
        }

        if (oversizedItems.length > 0) {
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Some Files Too Large',
                html: `The following items exceed 400MB and will be skipped:<br><br><b>${oversizedItems.slice(0, 5).join(', ')}${oversizedItems.length > 5 ? ` +${oversizedItems.length - 5} more` : ''}</b><br><br>Continue with remaining files?`,
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

        // Process in batches
        for (let i = 0; i < itemIds.length; i += CONCURRENT_DOWNLOADS) {
            const batch = itemIds.slice(i, i + CONCURRENT_DOWNLOADS);
            
            await Promise.all(batch.map(async (id, batchIdx) => {
                const format = selectedFormats[id] || groupedItems[id]?.[0];
                if (!format) return;

                // Skip oversized files
                const filesize = format.filesize || fileSizes[`${id}-${format.quality}`];
                const filesizeNum = typeof filesize === 'string' ? parseInt(filesize, 10) : filesize;
                if (filesizeNum && filesizeNum > MAX_FILESIZE_BYTES) {
                    skipped++;
                    return;
                }

                const idx = i + batchIdx + 1;
                setZipProgress({ current: idx, total: itemIds.length, status: `Downloading ${idx}/${itemIds.length}...` });

                try {
                    const proxyUrl = getProxyUrl(format.url, { platform, inline: true });
                    const response = await fetch(proxyUrl);
                    
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    const blob = await response.blob();
                    const ext = format.type === 'video' ? 'mp4' : 
                               format.type === 'audio' ? 'mp3' : 
                               format.url.split('.').pop()?.split('?')[0] || 'jpg';
                    const filename = `${String(idx).padStart(3, '0')}_${format.quality || 'media'}.${ext}`;
                    
                    folder.file(filename, blob);
                    downloaded++;
                } catch (err) {
                    console.error(`Failed to download item ${idx}:`, err);
                    failed++;
                }
            }));
        }

        if (downloaded === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Download Failed',
                text: 'Could not download any files. Please try again.',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
            });
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

            // Trigger download
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.title?.substring(0, 50).replace(/[<>:"/\\|?*]/g, '_') || 'download'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Show success
            if (failed > 0 || skipped > 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Partial Download',
                    text: `Downloaded ${downloaded} files.${failed > 0 ? ` ${failed} failed.` : ''}${skipped > 0 ? ` ${skipped} skipped (>400MB).` : ''}`,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                });
            }
        } catch (err) {
            console.error('ZIP creation failed:', err);
            Swal.fire({
                icon: 'error',
                title: 'ZIP Failed',
                text: 'Failed to create ZIP file.',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
            });
        }

        setGlobalStatus('idle');
        setZipProgress(null);
    };

    const renderFormatButtons = (formats: MediaFormat[], itemId: string) => (
        <div className="flex flex-col gap-2">
            {(() => {
                const selectorFormats = buildSelectorFormats(formats, platform, true);
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
                        {/* Response time FIRST, then public/private badge */}
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
                {/* Description - truncated to ~150 chars */}
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
                                    {/* Index badge - top left */}
                                    <div className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">{index + 1}</div>
                                    {/* Quality badge - top right (only for video) */}
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
                                    {/* Video play icon overlay */}
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
                        {/* Thumbnail + Audio Convert column */}
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
                                {/* Preview overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            {/* Audio Conversion removed - now in renderFormatButtons */}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                            {renderFormatButtons(groupedItems[selectedItemId], selectedItemId)}
                            <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                                {/* Preview button */}
                                <Button size="xs" variant="secondary" onClick={() => {
                                    setGalleryInitialIndex(itemIds.indexOf(selectedItemId));
                                    setShowGallery(true);
                                }}
                                    leftIcon={<Maximize2 className="w-3.5 h-3.5" />}>
                                    Preview
                                </Button>
                                {/* Discord button */}
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
                                            {activeDownloadLabel}
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
                                            ? 'Terlalu besar'
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
                                                icon: <Download className="w-4 h-4" />,
                                                onClick: () => {
                                                    const format = selectedFormats[selectedItemId] || groupedItems[selectedItemId]?.[0];
                                                    if (format) triggerDownload(format, selectedItemId);
                                                },
                                            },
                                            {
                                                id: 'download-all',
                                                label: t('downloadAllOption'),
                                                icon: <Download className="w-4 h-4" />,
                                                onClick: handleDownloadAll,
                                            },
                                            {
                                                id: 'download-zip',
                                                label: t('downloadZip'),
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
                            {/* Progress Bar for carousel item */}
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
                    {/* Thumbnail + Audio Convert column */}
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
                            {/* Preview overlay */}
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
                            {/* Preview button */}
                            <Button size="xs" variant="secondary" onClick={() => {
                                setGalleryInitialIndex(0);
                                setShowGallery(true);
                            }}
                                leftIcon={<Maximize2 className="w-3.5 h-3.5" />}>
                                Preview
                            </Button>
                            {/* Discord button */}
                            <Button size="xs" variant="secondary" onClick={() => handleSendToWebhook(selectedFormats[itemIds[0]], itemIds[0])}
                                disabled={sentToWebhook[itemIds[0]]}
                                leftIcon={sentToWebhook[itemIds[0]] ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" /> : <Send className="w-3.5 h-3.5" />}>
                                {sentToWebhook[itemIds[0]] ? t('sent') : t('discord')}
                            </Button>
                            {/* Download button */}
                            {downloadStatus[itemIds[0]] === 'downloading' ? (
                                <div className="downaria-downloading-row">
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        disabled
                                        leftIcon={<Loader2 className="animate-spin w-3.5 h-3.5" />}
                                    >
                                        {activeDownloadLabel}
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
                                    title={isOverSizeLimit(selectedFormats[itemIds[0]]) ? `File terlalu besar (max ${MAX_FILESIZE_LABEL} / ${MAX_FILESIZE_MB}MB)` : undefined}
                                    leftIcon={<Download className="w-3.5 h-3.5" />}>
                                    {isOverSizeLimit(selectedFormats[itemIds[0]]) 
                                        ? `Terlalu besar (max ${MAX_FILESIZE_LABEL})`
                                        : downloadStatus[itemIds[0]] === 'success' ? t('downloaded') : 'Download'}
                                </Button>
                            )}
                        </div>
                        {/* Progress Bar */}
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
                                <span>Sembunyikan</span>
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
                <span>Download Limit: Max {MAX_FILESIZE_LABEL} per file. Pilih kualitas yang lebih rendah jika file terlalu besar.</span>
            </div>
        </motion.div>
    );
}
