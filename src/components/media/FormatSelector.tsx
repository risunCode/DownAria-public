/**
 * FormatSelector - Reusable format/quality selection buttons
 * Used in DownloadPreview and MediaGallery
 */

'use client';

import { MediaFormat, PlatformId } from '@/lib/types';
import { MusicIcon } from '@/components/ui/Icons';
import { getMediaFormatIdentity } from '@/lib/utils/media';

interface FormatSelectorProps {
    formats: MediaFormat[];
    selected: MediaFormat | null;
    onSelect: (format: MediaFormat) => void;
    getSize?: (format: MediaFormat) => string | null;
    showAudioLabel?: boolean;
    className?: string;
    platform?: PlatformId;
}

/**
 * Display format selection buttons grouped by type
 * Shows file sizes when available
 */
export function FormatSelector({
    formats,
    selected,
    onSelect,
    getSize,
    showAudioLabel = true,
    className = ''
}: FormatSelectorProps) {
    const getSelectorIdentity = (format: MediaFormat): string => {
        const requestedAudioFormat = format.requestedAudioFormat || '';
        const hash = format.hash || '';
        const formatId = format.formatId || '';
        const synthetic = format.isSyntheticAudioOption ? '1' : '0';
        return `${getMediaFormatIdentity(format)}|${format.url}|${requestedAudioFormat}|${hash}|${formatId}|${synthetic}`;
    };
    const selectedIdentity = selected ? getSelectorIdentity(selected) : null;

    // Group formats by type
    const videoFormats = formats.filter(f => f.type === 'video');
    const audioFormats = formats.filter(f => f.type === 'audio');
    const imageFormats = formats.filter(f => f.type === 'image');

    // Helper to get display quality (clean up generic names)
    const getDisplayQuality = (format: MediaFormat): string => {
        const quality = format.quality.toLowerCase();
        if (quality.startsWith('image')) {
            return format.type === 'video' ? 'Video' : 'Original';
        }
        return format.quality;
    };

    // Render format button
    const renderButton = (format: MediaFormat, idx: number, prefix: string) => {
        const formatIdentity = getSelectorIdentity(format);
        const isSelected = selectedIdentity === formatIdentity;
        const size = getSize?.(format);
        const displayQuality = getDisplayQuality(format);
        const needsMerge = format.needsMerge;
        // Add ~ prefix for estimated sizes (YouTube merge formats)
        const displaySize = size ? (needsMerge ? `~${size}` : size) : null;

        return (
            <button
                key={`${prefix}-${idx}-${formatIdentity}`}
                onClick={() => onSelect(format)}
                title={needsMerge ? 'HD quality - will merge video + audio' : undefined}
                className={`format-option px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    isSelected
                        ? 'is-selected bg-[var(--accent-primary)] text-white border-black/35 shadow-md shadow-black/45'
                        : 'bg-[var(--bg-secondary)] border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                }`}
            >
                {displayQuality}
                {needsMerge && <span className="ml-1 text-yellow-500">⚡</span>}
                {displaySize && <span className={`ml-1 ${isSelected ? 'opacity-95' : 'opacity-70'}`}>({displaySize})</span>}
            </button>
        );
    };

    // Hide if only one format with generic name
    if (formats.length === 1 && formats[0].quality.toLowerCase().startsWith('image')) {
        return null;
    }

    return (
        <div className={`format-selector-surface space-y-2 ${className}`}>
            {/* Video formats */}
            {videoFormats.length > 0 && (
                <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Video</span>
                    <div className="flex flex-wrap gap-2">
                    {videoFormats.map((format, idx) => renderButton(format, idx, 'v'))}
                    </div>
                </div>
            )}

            {/* Image formats */}
            {imageFormats.length > 0 && (
                <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Image</span>
                    <div className="flex flex-wrap gap-2">
                        {imageFormats.map((format, idx) => renderButton(format, idx, 'i'))}
                    </div>
                </div>
            )}

            {/* Audio formats */}
            {audioFormats.length > 0 && (
                <div className="space-y-1">
                    {showAudioLabel && (
                        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mr-2 flex items-center">
                            <MusicIcon className="w-3 h-3 mr-1" /> Audio
                        </span>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {audioFormats.map((format, idx) => renderButton(format, idx, 'a'))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default FormatSelector;
