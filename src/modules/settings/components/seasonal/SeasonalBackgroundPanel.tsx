'use client';

import { ArrowUpDown, Droplets, Eye, EyeOff, Image, Loader2, Trash2, Video, Volume2, VolumeX, ZoomIn } from 'lucide-react';

import { type SeasonalBackgroundInfo } from '@/modules/settings/hooks/useSeasonalSettingsForm';
import { Button } from '@/shared/ui/Button';
import { Slider } from '@/shared/ui/Slider';
import { cn } from '@/shared/utils/cn';

interface SeasonalBackgroundPanelProps {
  hasBackground: boolean;
  backgroundInfo: SeasonalBackgroundInfo | null;
  backgroundOpacity: number;
  backgroundBlur: number;
  backgroundZoom: number;
  backgroundPositionY: number;
  backgroundSoundEnabled: boolean;
  backgroundVolume: number;
  backgroundEnabled: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  formatFileSize: (bytes: number) => string;
  labels: {
    title: string;
    emptyState: string;
    image: string;
    video: string;
    upload: string;
    change: string;
    visibility: string;
    visibilityHint: string;
    blur: string;
    zoom: string;
    zoomHint: string;
    moveVertical: string;
    moveVerticalHint: string;
    sound: string;
    volume: string;
    enabled: string;
    enabledHint: string;
  };
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveBackground: () => Promise<void>;
  onOpacityChange: (value: number) => void;
  onBlurChange: (value: number) => void;
  onZoomChange: (value: number) => void;
  onPositionChange: (value: number) => void;
  onSoundToggle: () => void;
  onVolumeChange: (value: number) => void;
  onEnabledToggle: () => void;
}

export function SeasonalBackgroundPanel({
  hasBackground,
  backgroundInfo,
  backgroundOpacity,
  backgroundBlur,
  backgroundZoom,
  backgroundPositionY,
  backgroundSoundEnabled,
  backgroundVolume,
  backgroundEnabled,
  isUploading,
  fileInputRef,
  formatFileSize,
  labels,
  onFileSelect,
  onRemoveBackground,
  onOpacityChange,
  onBlurChange,
  onZoomChange,
  onPositionChange,
  onSoundToggle,
  onVolumeChange,
  onEnabledToggle,
}: SeasonalBackgroundPanelProps) {
  const currentTypeLabel = backgroundInfo?.type === 'video' ? labels.video : labels.image;

  return (
    <div className="p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {hasBackground ? backgroundInfo?.type === 'video' ? <Video className="w-5 h-5 text-[var(--accent-primary)]" /> : <Image className="w-5 h-5 text-[var(--accent-primary)]" /> : <Image className="w-5 h-5 text-[var(--text-muted)]" />}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{labels.title}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {hasBackground && backgroundInfo ? `${currentTypeLabel} - ${formatFileSize(backgroundInfo.size)}` : labels.emptyState}
            </p>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*,video/*,.gif" onChange={onFileSelect} className="hidden" />

        {hasBackground ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.change}
            </Button>
            <Button variant="danger" size="sm" onClick={() => void onRemoveBackground()}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {labels.upload}
          </Button>
        )}
      </div>

      {hasBackground ? (
        <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">{labels.visibility}</span>
            </div>
            <Slider value={backgroundOpacity} min={0} max={40} onChange={onOpacityChange} showValue valueFormat={(value) => `${value}%`} color="blue" />
            <p className="text-[10px] text-[var(--text-muted)]">{labels.visibilityHint}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">{labels.blur}</span>
            </div>
            <Slider value={backgroundBlur} min={0} max={20} onChange={onBlurChange} showValue valueFormat={(value) => `${value}px`} color="blue" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ZoomIn className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">{labels.zoom}</span>
            </div>
            <Slider value={backgroundZoom} min={65} max={150} onChange={onZoomChange} showValue valueFormat={(value) => `${value}%`} color="blue" />
            <p className="text-[10px] text-[var(--text-muted)]">{labels.zoomHint}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">{labels.moveVertical}</span>
            </div>
            <Slider value={backgroundPositionY} min={0} max={100} onChange={onPositionChange} showValue valueFormat={(value) => `${value}%`} color="blue" />
            <p className="text-[10px] text-[var(--text-muted)]">{labels.moveVerticalHint}</p>
          </div>

          {backgroundInfo?.type === 'video' ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {backgroundSoundEnabled ? <Volume2 className="w-4 h-4 text-[var(--accent-primary)]" /> : <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />}
                  <span className="text-xs text-[var(--text-secondary)]">{labels.sound}</span>
                </div>
                <button
                  onClick={onSoundToggle}
                  className={cn(
                    'relative w-12 h-6 rounded-full shrink-0 transition-colors',
                    backgroundSoundEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                  )}
                >
                  <span className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', backgroundSoundEnabled ? 'translate-x-6' : 'translate-x-0')} />
                </button>
              </div>

              {backgroundSoundEnabled ? (
                <div className="space-y-2 pl-6">
                  <span className="text-xs text-[var(--text-muted)]">{labels.volume}</span>
                  <Slider value={backgroundVolume} min={0} max={100} step={5} onChange={onVolumeChange} showValue valueFormat={(value) => `${value}%`} color="blue" />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              {backgroundEnabled ? <Eye className="w-4 h-4 text-[var(--accent-primary)]" /> : <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />}
              <div>
                <span className="text-xs text-[var(--text-secondary)]">{labels.enabled}</span>
                <p className="text-[10px] text-[var(--text-muted)]">{labels.enabledHint}</p>
              </div>
            </div>
            <button
              onClick={onEnabledToggle}
              className={cn(
                'relative w-12 h-6 rounded-full shrink-0 transition-colors',
                backgroundEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              )}
            >
              <span className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', backgroundEnabled ? 'translate-x-6' : 'translate-x-0')} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
