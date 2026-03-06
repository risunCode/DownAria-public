'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ChevronDown, Download, Send, Link2, Play, User, Loader2, Check, Share2 } from 'lucide-react';
import Image from 'next/image';
import { MediaData, MediaFormat, PlatformId } from '@/lib/types';
import { formatBytes } from '@/lib/utils/format';
import { getProxiedThumbnail } from '@/lib/api/proxy';
import { getProxyUrl } from '@/lib/api/proxy';
import { RichText } from '@/lib/utils/text-parser';
import { sendDiscordNotification, getUserDiscordSettings } from '@/lib/utils/discord-webhook';
import { lazySwal } from '@/lib/utils/lazy-swal';
import { toast } from 'sonner';
import { SplitButton } from '@/components/ui/SplitButton';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TrafficLights } from '@/components/ui/TrafficLights';
import { MAX_FILESIZE_BYTES, MAX_FILESIZE_LABEL, MAX_FILESIZE_MB } from '@/lib/constants/download-limits';
import {
  groupFormatsByItem,
  getDisplayFormatsForPlatform,
  getMediaFormatIdentity,
  getItemThumbnails,
  findPreferredFormat,
  buildSelectorFormats,
  getQualityBadge,
  isHlsFormat,
} from '@/lib/utils/media';
import {
  setDownloadProgress as setGlobalDownloadProgress,
} from '@/lib/stores/download-store';
import { useDownloadSync } from '@/hooks/useDownloadSync';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { EngagementDisplay } from './EngagementDisplay';
import { FormatSelector } from './FormatSelector';
import { DownloadProgress } from './DownloadProgress';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MediaGalleryProps {
  data: MediaData;
  platform: PlatformId;
  responseJson?: unknown;
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
  initialFormat?: MediaFormat | null;
}

interface DownloadState {
  status: 'idle' | 'downloading' | 'done' | 'error';
  progress: number;
  speed: number;
  loaded: number;
  total: number;
  message?: string;
}

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

function useMediaGalleryMode(): 'modal' | 'fullscreen' {
  const [mode, setMode] = useState<'modal' | 'fullscreen'>('modal');

  useEffect(() => {
    const checkMode = () => {
      setMode(window.innerWidth < 768 ? 'fullscreen' : 'modal');
    };
    checkMode();
    window.addEventListener('resize', checkMode);
    return () => window.removeEventListener('resize', checkMode);
  }, []);

  return mode;
}

function useKeyboardNavigation(
  onClose: () => void,
  onPrev: () => void,
  onNext: () => void,
  isOpen: boolean
) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);
}

function useSwipeNavigation(
  onPrev: () => void,
  onNext: () => void,
  isEnabled: boolean
) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isEnabled) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      isSwiping.current = true;
    }
  }, [isEnabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isEnabled || !isSwiping.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;

    if (deltaX > threshold) {
      onPrev();
    } else if (deltaX < -threshold) {
      onNext();
    }

    isSwiping.current = false;
  }, [isEnabled, onPrev, onNext]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MediaGallery({ data, platform, responseJson, isOpen, onClose, initialIndex = 0, initialFormat = null }: MediaGalleryProps) {
  const mode = useMediaGalleryMode();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedFormat, setSelectedFormat] = useState<MediaFormat | null>(initialFormat);
  const [downloadState, setDownloadState] = useState<DownloadState>({ status: 'idle', progress: 0, speed: 0, loaded: 0, total: 0 });
  const [fileSizes, setFileSizes] = useState<Record<string, string>>({});
  const [discordSent, setDiscordSent] = useState<Record<string, boolean>>({});
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showResponseJsonModal, setShowResponseJsonModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopCountRef = useRef(0);
  const MAX_LOOPS = 8;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if format exceeds global size limit
  const isOverSizeLimit = (format: MediaFormat | null): boolean => {
    if (!format) return false;
    return (format.filesize || 0) > MAX_FILESIZE_BYTES;
  };

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoize grouped formats
  const displayFormats = useMemo(
    () => getDisplayFormatsForPlatform(data.formats || [], platform),
    [data.formats, platform]
  );
  const groupedItems = useMemo(() => groupFormatsByItem(displayFormats), [displayFormats]);
  const itemThumbnails = useMemo(() => getItemThumbnails(displayFormats), [displayFormats]);
  const itemIds = useMemo(() => Object.keys(groupedItems), [groupedItems]);
  const isCarousel = itemIds.length > 1;
  const currentItemId = itemIds[currentIndex] || 'main';
  const currentFormats = groupedItems[currentItemId] || [];
  const disableAudioConvertForFacebookStory =
    platform === 'facebook' && (
      (data.contentType || '').toLowerCase() === 'story' ||
      /\/stories(?:\/|$)/i.test(data.url || '')
    );
  const includeSyntheticAudio = !disableAudioConvertForFacebookStory;
  const selectorFormats = useMemo(() => {
    return buildSelectorFormats(currentFormats, platform, includeSyntheticAudio);
  }, [currentFormats, includeSyntheticAudio, platform]);
  const currentThumbnail = itemThumbnails[currentItemId] || currentFormats[0]?.thumbnail || data.thumbnail;
  const authorHandle = data.authorUsername;
  const normalizedAuthorHandle = authorHandle
    ? authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`
    : null;
  const displayAuthor = data.author || data.authorAlias || normalizedAuthorHandle || 'Unknown';

  // Sync initialFormat when modal opens
  useEffect(() => {
    if (isOpen && initialFormat) {
      setSelectedFormat(initialFormat);
      if (initialFormat.itemId) {
        const idx = itemIds.indexOf(initialFormat.itemId);
        if (idx >= 0) {
          setCurrentIndex(idx);
        }
      }
    }
  }, [isOpen, initialFormat, itemIds]);

  // Download sync via hook
  const { progress: syncProgress } = useDownloadSync(data.url);

  // Sync download state from global store
  useEffect(() => {
    if (!isOpen) return;
    if (syncProgress.status !== 'idle') {
      setDownloadState({
        status: syncProgress.status,
        progress: syncProgress.percent,
        speed: syncProgress.speed,
        loaded: syncProgress.loaded,
        total: syncProgress.total,
        message: syncProgress.message,
      });
    }
  }, [isOpen, syncProgress]);

  // Auto-select format when switching items
  useEffect(() => {
    if (selectorFormats.length === 0) {
      if (selectedFormat) setSelectedFormat(null);
      return;
    }

    if (!selectedFormat) {
      const preferred = findPreferredFormat(selectorFormats) || selectorFormats[0];
      setSelectedFormat(preferred);
      return;
    }

    const selectedIdentity = `${getMediaFormatIdentity(selectedFormat)}|${selectedFormat.url}`;
    const matchedSelection = selectorFormats.find((format) => `${getMediaFormatIdentity(format)}|${format.url}` === selectedIdentity);
    if (!matchedSelection) {
      setSelectedFormat(selectorFormats[0]);
      return;
    }

    if (matchedSelection !== selectedFormat) {
      setSelectedFormat(matchedSelection);
    }
  }, [selectorFormats, selectedFormat]);

  // Track if this is initial open
  const hasInitialFormat = useRef(false);
  useEffect(() => {
    if (isOpen && initialFormat) {
      hasInitialFormat.current = true;
    }
    if (!isOpen) {
      hasInitialFormat.current = false;
    }
  }, [isOpen, initialFormat]);

  // Reset format on item change
  const prevIndex = useRef(currentIndex);
  useEffect(() => {
    if (prevIndex.current !== currentIndex) {
      const newItemId = itemIds[currentIndex] || 'main';
      const newFormats = groupedItems[newItemId] || [];
      const selectorFormatsForItem = buildSelectorFormats(newFormats, platform, includeSyntheticAudio);
      const preferred = findPreferredFormat(selectorFormatsForItem);
      setSelectedFormat(preferred || null);
      setDownloadState({ status: 'idle', progress: 0, speed: 0, loaded: 0, total: 0 });
      loopCountRef.current = 0;

      if (hasInitialFormat.current) {
        hasInitialFormat.current = false;
      }
    }
    prevIndex.current = currentIndex;
  }, [currentIndex, itemIds, groupedItems, includeSyntheticAudio, platform]);

  // Reset loop counter when format changes
  useEffect(() => {
    loopCountRef.current = 0;
  }, [selectedFormat]);

  // Video loop handler
  const handleVideoEnded = useCallback(() => {
    loopCountRef.current += 1;

    if (loopCountRef.current >= MAX_LOOPS) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  }, []);

  // Populate file sizes from backend JSON
  useEffect(() => {
    if (!isOpen) return;

    const backendSizes: Record<string, string> = {};
    Object.values(groupedItems).forEach(formats => {
      formats.forEach(f => {
        if (f.filesize && f.filesize > 0) {
          backendSizes[f.url] = formatBytes(f.filesize);
        }
      });
    });

    setFileSizes(backendSizes);
  }, [isOpen, groupedItems]);

  // Navigation
  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : itemIds.length - 1));
  }, [itemIds.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev < itemIds.length - 1 ? prev + 1 : 0));
  }, [itemIds.length]);

  useKeyboardNavigation(handleClose, goToPrev, goToNext, isOpen);

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigation(goToPrev, goToNext, isCarousel);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Navigation guard: beforeunload + paste blocking
  useNavigationGuard({
    isActive: isOpen && downloadState.status === 'downloading',
    useBeforeUnload: true,
    beforeUnloadMessage: 'Download is in progress. Are you sure you want to leave?',
    pasteBlockMessage: 'Please wait for the download to finish before pasting a new URL.',
  });

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!selectedFormat) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setDownloadState({ status: 'downloading', progress: 0, speed: 0, loaded: 0, total: 0 });
    setGlobalDownloadProgress(data.url, { status: 'downloading', percent: 0, loaded: 0, total: 0, speed: 0 });

    try {
      const { downloadMedia, triggerBlobDownload } = await import('@/lib/utils/media');
      const carouselIndex = isCarousel ? currentIndex + 1 : undefined;

      const result = await downloadMedia(selectedFormat, data, platform, carouselIndex, (progress) => {
        setDownloadState({
          status: progress.status === 'done' ? 'done' : progress.status === 'error' ? 'error' : 'downloading',
          progress: progress.percent,
          speed: progress.speed,
          loaded: progress.loaded,
          total: progress.total,
          message: progress.message,
        });
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
        if (result.error === 'Download cancelled') {
          setDownloadState({ status: 'idle', progress: 0, speed: 0, loaded: 0, total: 0 });
          setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
          return;
        }
        throw new Error(result.error || 'Download failed');
      }

      if (result.blob && result.filename) {
        triggerBlobDownload(result.blob, result.filename);
      }

      setDownloadState({ status: 'done', progress: 100, speed: 0, loaded: result.blob?.size || 0, total: result.blob?.size || 0 });
      setGlobalDownloadProgress(data.url, { status: 'done', percent: 100, loaded: 0, total: 0, speed: 0 });

      setTimeout(() => {
        setDownloadState(prev => ({ ...prev, status: 'idle' }));
        setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
      }, 3000);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setDownloadState({ status: 'idle', progress: 0, speed: 0, loaded: 0, total: 0 });
        setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
        return;
      }

      console.error('Download error:', err);
      setDownloadState({ status: 'error', progress: 0, speed: 0, loaded: 0, total: 0 });
      setGlobalDownloadProgress(data.url, { status: 'error', percent: 0, loaded: 0, total: 0, speed: 0 });
      setTimeout(() => {
        setDownloadState(prev => ({ ...prev, status: 'idle' }));
        setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
      }, 3000);
    } finally {
      abortControllerRef.current = null;
    }
  }, [selectedFormat, data, platform, isCarousel, currentIndex]);

  const cancelDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setDownloadState({ status: 'idle', progress: 0, speed: 0, loaded: 0, total: 0 });
    setGlobalDownloadProgress(data.url, { status: 'idle', percent: 0, loaded: 0, total: 0, speed: 0 });
  }, [data.url]);

  // Discord handler
  const handleDiscord = useCallback(async () => {
    if (!selectedFormat) return;

    if (discordSent[currentItemId]) {
      toast.info('This item was already sent to Discord.');
      return;
    }

    const settings = getUserDiscordSettings();
    if (!settings?.webhookUrl) {
      lazySwal.fire({
        icon: 'warning',
        title: 'Webhook Not Configured',
        text: 'Configure Discord webhook in Settings first.',
        confirmButtonText: 'Go to Settings',
        showCancelButton: true,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      }).then(result => {
        if (result.isConfirmed) window.location.href = '/settings';
      });
      return;
    }

    const result = await sendDiscordNotification({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      title: data.title || 'Untitled',
      quality: selectedFormat.quality,
      thumbnail: currentThumbnail,
      mediaUrl: selectedFormat.url,
      mediaType: selectedFormat.type,
      sourceUrl: data.url,
      author: data.author,
      engagement: data.engagement,
      fileSize: selectedFormat.filesize || 0,
    }, true);

    if (result.sent) {
      setDiscordSent(prev => ({ ...prev, [currentItemId]: true }));
      toast.success('Sent!');
    }
  }, [selectedFormat, currentItemId, discordSent, platform, data, currentThumbnail]);

  // Copy link handler
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(data.url);
    toast.success('Link Copied!');
  }, [data.url]);

  const responseJsonText = useMemo(() => {
    try {
      return JSON.stringify(responseJson ?? data, null, 2);
    } catch {
      return JSON.stringify({ error: 'Unable to serialize response JSON' }, null, 2);
    }
  }, [responseJson, data]);

  const handleCopyResponse = useCallback(async () => {
    if (!navigator.clipboard?.writeText) {
      toast.error('Copy is not supported in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(responseJsonText);
      toast.success('Response Copied');
    } catch {
      toast.error('Failed to copy response JSON.');
    }
  }, [responseJsonText]);

  const youtubeQuality = (selectedFormat?.quality || '').toLowerCase();

  const isHlsVideo = selectedFormat?.type === 'video' && isHlsFormat(selectedFormat);
  const canDirectPlayYoutubeVideo =
    platform === 'youtube' &&
    selectedFormat?.type === 'video' &&
    (youtubeQuality.includes('360') || !selectedFormat.needsMerge);
  const showYoutubePreviewUnavailable =
    platform === 'youtube' && selectedFormat?.type === 'video' && !canDirectPlayYoutubeVideo;
  const showHlsPreviewUnavailable =
    selectedFormat?.type === 'video' && isHlsVideo;

  const content = (
    <>
      {/* Media Preview */}
      <div
        className="relative w-full aspect-video max-h-[45vh] bg-black rounded-lg overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {selectedFormat?.type === 'video' ? (
          showYoutubePreviewUnavailable || showHlsPreviewUnavailable ? (
            <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-[var(--bg-secondary)] to-black">
              {currentThumbnail && (
                <Image
                  src={getProxiedThumbnail(currentThumbnail, platform)}
                  alt={data.title || 'YouTube video'}
                  fill
                  className="object-cover opacity-35 blur-md"
                  unoptimized
                />
              )}
              <div className="relative z-10 w-[92%] sm:w-[82%] max-w-2xl mx-4 p-3 sm:p-4 rounded-xl border border-white/15 bg-black/45 backdrop-blur-sm">
                <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[140px_1fr] gap-3 sm:gap-4 items-center">
                  <div className="relative w-24 h-16 sm:w-36 sm:h-24 rounded-lg overflow-hidden border border-white/15 bg-black/35">
                    {currentThumbnail ? (
                      <Image
                        src={getProxiedThumbnail(currentThumbnail, platform)}
                        alt={data.title || 'YouTube thumbnail'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white/70" />
                      </div>
                    )}
                  </div>

                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Preview unavailable for this format</p>
                    <p className="text-xs text-white/70 mt-1">
                      {showYoutubePreviewUnavailable
                        ? '360p and audio formats can be played directly. Other YouTube video qualities stay downloadable.'
                        : 'HLS live preview disabled. Use Download/Merge to get the final media file.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={getProxyUrl(selectedFormat.url, { platform })}
              poster={currentThumbnail ? getProxiedThumbnail(currentThumbnail, platform) : undefined}
              className="w-full h-full object-contain"
              controls
              autoPlay={platform !== 'youtube'}
              playsInline
              onEnded={handleVideoEnded}
            />
          )
        ) : selectedFormat?.type === 'audio' ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-900/50 to-black">
            {currentThumbnail && (
              <Image
                src={getProxiedThumbnail(currentThumbnail, platform)}
                alt={data.title || 'Audio'}
                fill
                className="object-cover opacity-30 blur-xl"
                unoptimized
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-sm">
              <div className="w-24 h-24 rounded-xl overflow-hidden shadow-2xl bg-[var(--bg-secondary)]">
                {currentThumbnail ? (
                  <Image
                    src={getProxiedThumbnail(currentThumbnail, platform)}
                    alt={data.title || 'Audio'}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-white/50" />
                  </div>
                )}
              </div>
              <audio
                src={getProxyUrl(selectedFormat.url, { platform })}
                className="w-full"
                controls
                autoPlay={platform !== 'youtube'}
              />
              <p className="text-xs text-white/60 text-center">🎵 Audio Only</p>
            </div>
          </div>
        ) : selectedFormat?.type === 'image' ? (
          <Image
            src={getProxyUrl(selectedFormat.url, { platform })}
            alt={data.title || 'Image'}
            fill
            className="object-contain"
            unoptimized
          />
        ) : currentThumbnail ? (
          <Image
            src={getProxiedThumbnail(currentThumbnail, platform)}
            alt={data.title || 'Media'}
            fill
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-white/50" />
          </div>
        )}

        {/* Carousel Navigation */}
        {isCarousel && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-20 touch-manipulation"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-20 touch-manipulation"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip for Carousel */}
      {isCarousel && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {itemIds.map((itemId, idx) => {
            const itemFormats = groupedItems[itemId];
            const thumb = itemThumbnails[itemId] || itemFormats[0]?.thumbnail || data.thumbnail;
            const isVideo = itemFormats[0]?.type === 'video';
            const qualityBadge = getQualityBadge(itemFormats);
            return (
              <button
                key={itemId}
                onClick={() => setCurrentIndex(idx)}
                className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all ${
                  idx === currentIndex
                    ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-card)]'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {thumb ? (
                  <Image
                    src={getProxiedThumbnail(thumb, platform)}
                    alt={`Item ${idx + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
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
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Info Section */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--text-primary)] truncate">{displayAuthor}</p>
            {normalizedAuthorHandle && (
              <p className="text-xs text-[var(--text-muted)] truncate">{normalizedAuthorHandle}</p>
            )}
            <p className="text-xs text-[var(--text-muted)]">{platform.charAt(0).toUpperCase() + platform.slice(1)}</p>
          </div>
          {data.responseTime && (
            <button
              type="button"
              onClick={() => setShowResponseJsonModal(true)}
              className="px-2 py-1 text-[10px] rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              title="View response JSON"
            >
              ⚡ {data.responseTime}ms
            </button>
          )}
          <span className={`px-2 py-1 text-[10px] rounded-full ${
            data.usedCookie
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {data.usedCookie ? '🔒 Private' : '🌐 Public'}
          </span>
        </div>

        {data.engagement && <EngagementDisplay engagement={data.engagement} className="text-[11px] text-[var(--text-muted)]" />}

        {data.description && (
          <div className="text-sm text-[var(--text-secondary)]">
            <span className={!captionExpanded ? 'line-clamp-2' : ''}>
              <RichText text={data.description} platform={platform} />
            </span>
            {data.description.length > 150 && (
              <button
                onClick={() => setCaptionExpanded(!captionExpanded)}
                className="text-[var(--accent-primary)] hover:underline text-xs mt-1 block"
              >
                {captionExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        <FormatSelector
          formats={selectorFormats}
          selected={selectedFormat}
          onSelect={setSelectedFormat}
          getSize={(f) => fileSizes[f.url] || null}
          platform={platform}
        />

        {platform === 'youtube' && (
          <p className="text-[10px] text-[var(--text-muted)] text-center mt-1">
            ⚠️ File sizes are estimated and may differ from actual download
          </p>
        )}

      </div>
    </>
  );

  // Action buttons
  const actionButtons = (
    <div className="p-4 space-y-3 border-t border-[var(--border-color)]/50 bg-[var(--bg-card)]">
      {isOverSizeLimit(selectedFormat) && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span>🚫</span>
          <span>File too large (max {MAX_FILESIZE_LABEL} / {MAX_FILESIZE_MB}MB). Choose a lower quality.</span>
        </div>
      )}

      <div className="flex gap-2">
        {downloadState.status === 'downloading' ? (
          <div className="downaria-downloading-row flex-1">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              disabled
              leftIcon={<Loader2 className="w-4 h-4 animate-spin" />}
            >
              Downloading...
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={cancelDownload}
              className="downaria-cancel-btn"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <SplitButton
            label={(() => {
              if (isOverSizeLimit(selectedFormat)) return `Max ${MAX_FILESIZE_LABEL}`;
              if (downloadState.status === 'done') return 'Done!';
              return 'Download';
            })()}
            icon={downloadState.status === 'done' ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            onMainClick={handleDownload}
            disabled={!selectedFormat || isOverSizeLimit(selectedFormat)}
            size="sm"
            variant="primary"
            className="flex-1"
            options={[
              {
                id: 'download-current',
                label: 'This Item',
                icon: <Download className="w-4 h-4" />,
                description: selectedFormat && fileSizes[selectedFormat.url] ? fileSizes[selectedFormat.url] : 'Current selection',
                onClick: handleDownload,
              },
              {
                id: 'copy-media-link',
                label: 'Copy Media URL',
                icon: <Link2 className="w-4 h-4" />,
                description: 'Copy selected format URL',
                onClick: () => {
                  if (selectedFormat?.url) {
                    navigator.clipboard.writeText(selectedFormat.url);
                  }
                },
              },
            ]}
          />
        )}

        <SplitButton
          label={'Share'}
          icon={discordSent[currentItemId] ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          onMainClick={handleDiscord}
          disabled={discordSent[currentItemId]}
          size="sm"
          variant="secondary"
          options={[
            {
              id: 'discord',
              label: 'Send to Discord',
              icon: <Send className="w-4 h-4" />,
              description: discordSent[currentItemId] ? 'Already sent' : 'Send via webhook',
              onClick: handleDiscord,
              disabled: discordSent[currentItemId],
            },
            {
              id: 'copy-source',
              label: 'Copy Link',
              icon: <Link2 className="w-4 h-4" />,
              description: 'Copy source URL',
              onClick: handleCopyLink,
            },
          ]}
        />
      </div>

      {downloadState.status === 'downloading' && (
        <DownloadProgress
          progress={{
            percent: downloadState.progress,
            loaded: downloadState.loaded,
            total: downloadState.total,
            speed: downloadState.speed,
            status: downloadState.status,
            message: downloadState.message
          }}
        />
      )}
    </div>
  );

  // Render based on mode
  const galleryShell = mode === 'fullscreen' ? (
    <FullscreenWrapper isOpen={isOpen} onClose={handleClose} footer={actionButtons}>{content}</FullscreenWrapper>
  ) : (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} footer={actionButtons}>{content}</ModalWrapper>
  );

  return (
    <>
      {galleryShell}
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
    </>
  );
}


// ═══════════════════════════════════════════════════════════════
// WRAPPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ModalWrapper({ children, isOpen, onClose, footer }: { children: React.ReactNode; isOpen: boolean; onClose: () => void; footer?: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="modal-theme-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-color)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Title Bar with Traffic Lights */}
            <div className="modal-theme-titlebar flex-shrink-0 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all flex items-center justify-center group" title="Close">
                  <X className="w-2 h-2 text-[#990000] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:brightness-90 transition-all flex items-center justify-center group" title="Minimize">
                  <span className="w-1.5 h-0.5 bg-[#995700] opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                </button>
                <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-90 transition-all flex items-center justify-center group" title="Expand">
                  <span className="w-1.5 h-1.5 border border-[#006500] opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
                </button>
                <span className="ml-2 text-xs text-[var(--text-muted)] font-medium">Preview</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {children}
            </div>
            {footer && (
              <div className="flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FullscreenWrapper({ children, isOpen, onClose, footer }: { children: React.ReactNode; isOpen: boolean; onClose: () => void; footer?: React.ReactNode }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const touchStartY = useRef(0);
  const currentDragY = useRef(0);
  const isDragging = useRef(false);
  const isAtTop = useRef(true);
  const wasPlaying = useRef(false);

  const [isClosingBySwipe, setIsClosingBySwipe] = useState(false);

  const pauseMedia = useCallback(() => {
    const videos = sheetRef.current?.querySelectorAll('video');
    const audios = sheetRef.current?.querySelectorAll('audio');
    videos?.forEach(v => {
      if (!v.paused) { wasPlaying.current = true; v.pause(); }
    });
    audios?.forEach(a => {
      if (!a.paused) { wasPlaying.current = true; a.pause(); }
    });
  }, []);

  const resumeMedia = useCallback(() => {
    if (wasPlaying.current) {
      const videos = sheetRef.current?.querySelectorAll('video');
      const audios = sheetRef.current?.querySelectorAll('audio');
      videos?.forEach(v => v.play().catch(() => {}));
      audios?.forEach(a => a.play().catch(() => {}));
      wasPlaying.current = false;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isAtTop.current = (contentRef.current?.scrollTop || 0) <= 5;
    currentDragY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (isAtTop.current && deltaY > 10) {
      if (!isDragging.current) {
        isDragging.current = true;
        pauseMedia();
      }

      e.preventDefault();
      currentDragY.current = Math.min(deltaY * 0.5, 250);

      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${currentDragY.current}px)`;
        sheetRef.current.style.opacity = `${1 - currentDragY.current / 400}`;
      }
      if (backdropRef.current) {
        backdropRef.current.style.opacity = `${0.5 - currentDragY.current / 600}`;
      }
    }
  }, [pauseMedia]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging.current) {
      const shouldClose = currentDragY.current > 80;

      if (shouldClose) {
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
          sheetRef.current.style.transform = 'translateY(100%)';
          sheetRef.current.style.opacity = '0';
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = 'opacity 0.25s ease-out';
          backdropRef.current.style.opacity = '0';
        }
        setIsClosingBySwipe(true);
        setTimeout(onClose, 250);
      } else {
        requestAnimationFrame(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out';
            sheetRef.current.style.transform = 'translateY(0)';
            sheetRef.current.style.opacity = '1';
          }
          if (backdropRef.current) {
            backdropRef.current.style.transition = 'opacity 0.3s ease-out';
            backdropRef.current.style.opacity = '0.5';
          }
        });
        resumeMedia();
      }

      setTimeout(() => {
        if (sheetRef.current && !isDragging.current) {
          sheetRef.current.style.transition = '';
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = '';
        }
      }, 350);

      isDragging.current = false;
      currentDragY.current = 0;
    }
  }, [onClose, resumeMedia]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !isOpen) return;

    sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
    sheet.addEventListener('touchmove', handleTouchMove, { passive: false });
    sheet.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    if (isOpen) {
      setIsClosingBySwipe(false);
      const timer = setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = '';
          sheetRef.current.style.opacity = '';
          sheetRef.current.style.transition = '';
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = '';
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (isClosingBySwipe) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            ref={backdropRef}
            key="fullscreen-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="modal-theme-backdrop fixed inset-0 z-50"
            onClick={onClose}
          />

          <motion.div
            ref={sheetRef}
            key="fullscreen"
            initial={{ y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[var(--bg-card)] rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col"
            style={{
              boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Header */}
            <div className="modal-theme-titlebar sticky top-0 z-10">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={onClose} className="w-4 h-4 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 transition-colors flex items-center justify-center group" title="Close">
                    <X className="w-2.5 h-2.5 text-[#990000] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button onClick={onClose} className="w-4 h-4 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 transition-colors flex items-center justify-center group" title="Minimize">
                    <ChevronLeft className="w-2.5 h-2.5 text-[#995700] opacity-0 group-hover:opacity-100 transition-opacity -rotate-90" />
                  </button>
                  <button onClick={onClose} className="w-4 h-4 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 transition-colors flex items-center justify-center group" title="Expand">
                    <ChevronRight className="w-2.5 h-2.5 text-[#006500] opacity-0 group-hover:opacity-100 transition-opacity rotate-45" />
                  </button>
                  <span className="ml-3 text-sm font-medium text-[var(--text-secondary)]">Preview</span>
                </div>

                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span className="text-xs font-medium">Hide</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={contentRef}
              className="overflow-y-auto flex-1 min-h-0 pb-safe overscroll-contain scrollbar-hide"
              style={{ maxHeight: footer ? 'calc(92vh - 70px - 120px)' : 'calc(92vh - 70px)' }}
            >
              {children}
            </div>

            {footer && (
              <div className="flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MediaGallery;
