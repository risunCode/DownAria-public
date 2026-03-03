'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Image,
  Video,
  Trash2,
  Loader2,
  Snowflake,
  Flower2,
  Leaf,
  Moon,
  Clock,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Droplets,
  ZoomIn,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import {
  SeasonType,
  getSeasonalSettings,
  saveSeasonalSettings,
  setSeasonalMode,
  setBackgroundOpacity,
  setBackgroundBlur,
  setBackgroundZoom,
  setBackgroundPosition,
  setBackgroundSound,
  setBackgroundVolume,
  setBackgroundEnabled,
  processBackgroundFile,
  clearCustomBackground,
  formatFileSize,
  getUnifiedSettings,
  saveUnifiedSettings,
} from '@/lib/storage';
import Swal from 'sweetalert2';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SEASON_OPTIONS: { id: 'auto' | 'random' | SeasonType; label: string; emoji: string; icon: typeof Snowflake }[] = [
  { id: 'auto', label: 'Auto', emoji: '✨', icon: Clock },
  { id: 'random', label: 'Random', emoji: '🎲', icon: Sparkles },
  { id: 'winter', label: 'Winter', emoji: '❄️', icon: Snowflake },
  { id: 'spring', label: 'Spring', emoji: '🌸', icon: Flower2 },
  { id: 'autumn', label: 'Autumn', emoji: '🍂', icon: Leaf },
  { id: 'off', label: 'Off', emoji: '🌙', icon: Moon },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SeasonalSettings() {
  // Experimental toggle
  const [experimentalEnabled, setExperimentalEnabled] = useState(true);

  // Seasonal state
  const [seasonalMode, setSeasonalModeState] = useState<'auto' | 'random' | SeasonType>('auto');
  const [hasBackground, setHasBackground] = useState(false);
  const [backgroundInfo, setBackgroundInfo] = useState<{ type: string; size: number } | null>(null);
  const [backgroundOpacity, setBackgroundOpacityState] = useState(8);
  const [backgroundBlur, setBackgroundBlurState] = useState(0);
  const [backgroundZoom, setBackgroundZoomState] = useState(100);
  const [backgroundPositionY, setBackgroundPositionY] = useState(50);
  const [backgroundSoundEnabled, setBackgroundSoundEnabled] = useState(false);
  const [backgroundVolumeState, setBackgroundVolumeState] = useState(50);
  const [backgroundEnabledState, setBackgroundEnabledState] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings
  useEffect(() => {
    const settings = getSeasonalSettings();
    const unified = getUnifiedSettings();
    setExperimentalEnabled(unified.experimentalEnabled);
    setSeasonalModeState(settings.mode);
    setBackgroundOpacityState(settings.backgroundOpacity);
    setBackgroundBlurState(settings.backgroundBlur);
    setBackgroundZoomState(settings.backgroundZoom);
    setBackgroundPositionY(settings.customBackground?.position?.y ?? 50);
    setBackgroundSoundEnabled(settings.backgroundSound);
    setBackgroundVolumeState(settings.backgroundVolume);
    setBackgroundEnabledState(settings.backgroundEnabled);
    if (settings.customBackground) {
      setHasBackground(true);
      setBackgroundInfo({
        type: settings.customBackground.type,
        size: settings.customBackground.size,
      });
    }

    // Listen for changes
    const handleChange = () => {
      const s = getSeasonalSettings();
      setSeasonalModeState(s.mode);
      setBackgroundOpacityState(s.backgroundOpacity);
      setBackgroundBlurState(s.backgroundBlur);
      setBackgroundZoomState(s.backgroundZoom);
      setBackgroundPositionY(s.customBackground?.position?.y ?? 50);
      setBackgroundSoundEnabled(s.backgroundSound);
      setBackgroundVolumeState(s.backgroundVolume);
      setBackgroundEnabledState(s.backgroundEnabled);
      if (s.customBackground) {
        setHasBackground(true);
        setBackgroundInfo({ type: s.customBackground.type, size: s.customBackground.size });
      } else {
        setHasBackground(false);
        setBackgroundInfo(null);
      }
    };
    window.addEventListener('seasonal-settings-changed', handleChange);
    return () => {
      window.removeEventListener('seasonal-settings-changed', handleChange);
    };
  }, []);

  const handleExperimentalChange = (enabled: boolean) => {
    setExperimentalEnabled(enabled);
    saveUnifiedSettings({ experimentalEnabled: enabled });
  };

  const handleSeasonChange = (mode: 'auto' | 'random' | SeasonType) => {
    setSeasonalMode(mode);
    setSeasonalModeState(mode);
  };

  const handleOpacityChange = (value: number) => {
    if (value > 20 && !hasShownWarning) {
      setHasShownWarning(true);
      Swal.fire({
        icon: 'warning',
        title: 'High Opacity Warning',
        text: 'High opacity may cause readability issues. You have been warned!',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        timer: 3000,
        showConfirmButton: false,
      });
    }
    setBackgroundOpacityState(value);
    setBackgroundOpacity(value);
  };

  const handleBlurChange = (value: number) => {
    setBackgroundBlurState(value);
    setBackgroundBlur(value);
  };

  const handleZoomChange = (value: number) => {
    setBackgroundZoomState(value);
    setBackgroundZoom(value);
  };

  const handleBackgroundPositionYChange = (value: number) => {
    setBackgroundPositionY(value);
    setBackgroundPosition({ y: value });
  };

  const handleSoundToggle = () => {
    const newValue = !backgroundSoundEnabled;
    setBackgroundSoundEnabled(newValue);
    setBackgroundSound(newValue);
  };

  const handleVolumeChange = (value: number) => {
    setBackgroundVolumeState(value);
    setBackgroundVolume(value);
  };

  const handleBackgroundEnabledToggle = () => {
    const newValue = !backgroundEnabledState;
    setBackgroundEnabledState(newValue);
    setBackgroundEnabled(newValue);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const bg = await processBackgroundFile(file);
      saveSeasonalSettings({ customBackground: bg });
      setHasBackground(true);
      setBackgroundInfo({ type: bg.type, size: bg.size });

      Swal.fire({
        icon: 'success',
        title: 'Background Set!',
        text: 'Custom background has been applied!',
        confirmButtonText: 'OK',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } catch (err) {
      console.error('[SeasonalSettings] Failed to upload background:', err);
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err instanceof Error ? err.message : 'Could not process file',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        confirmButtonText: 'OK',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveBackground = async () => {
    await clearCustomBackground();
    setHasBackground(false);
    setBackgroundInfo(null);
  };

  return (
    <>
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all">
        <div className="flex items-center gap-3">
          <Sparkles className={cn('w-5 h-5', experimentalEnabled ? 'text-purple-500' : 'text-[var(--text-muted)]')} />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Enable Experimental Features</p>
            <p className="text-xs text-[var(--text-muted)]">Access beta features and early previews</p>
          </div>
        </div>
        <button
          onClick={() => handleExperimentalChange(!experimentalEnabled)}
          className={cn(
            'relative w-12 h-6 rounded-full transition-colors',
            experimentalEnabled ? 'bg-purple-500' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
          )}
        >
          <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', experimentalEnabled ? 'left-7' : 'left-1')} />
        </button>
      </div>

      {/* Experimental Features */}
      <AnimatePresence>
        {experimentalEnabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            {/* Warning Card */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-500">Experimental Features Warning</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    These features are in beta and may cause unexpected behavior. If you experience background flickering or blinking, try refreshing the page.
                  </p>
                </div>
              </div>
            </div>

            {/* Seasonal Effects */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/35 hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Seasonal Effects</p>
                  <p className="text-xs text-[var(--text-muted)]">Particle animations (snow, cherry blossoms, leaves)</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SEASON_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSeasonChange(option.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all bg-[var(--bg-card)]/35',
                      seasonalMode === option.id
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-purple-500/50'
                    )}
                  >
                    <span className="text-lg">{option.emoji}</span>
                    <span className="text-[10px] font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Background */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {hasBackground ? (
                    backgroundInfo?.type === 'video' ? (
                      <Video className="w-5 h-5 text-purple-500" />
                    ) : (
                      <Image className="w-5 h-5 text-purple-500" />
                    )
                  ) : (
                    <Image className="w-5 h-5 text-[var(--text-muted)]" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Custom Background</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {hasBackground && backgroundInfo
                        ? `${backgroundInfo.type === 'video' ? 'Video' : 'Image'} • ${formatFileSize(backgroundInfo.size)}`
                        : 'Image/Video/GIF (max 800MB)'}
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {hasBackground ? (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleRemoveBackground}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Upload
                  </Button>
                )}
              </div>

              {/* Background Controls - only show when background is set */}
              {hasBackground && (
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  {/* Visibility Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Visibility</span>
                    </div>
                    <Slider
                      value={backgroundOpacity}
                      min={0}
                      max={40}
                      onChange={handleOpacityChange}
                      showValue
                      valueFormat={(v) => `${v}%`}
                      color="purple"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">Best on dark theme and 8% transparency</p>
                  </div>

                  {/* Blur Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Background Blur</span>
                    </div>
                    <Slider
                      value={backgroundBlur}
                      min={0}
                      max={20}
                      onChange={handleBlurChange}
                      showValue
                      valueFormat={(v) => `${v}px`}
                      color="purple"
                    />
                  </div>

                  {/* Zoom Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ZoomIn className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Background Zoom</span>
                    </div>
                    <Slider
                      value={backgroundZoom}
                      min={65}
                      max={150}
                      onChange={handleZoomChange}
                      showValue
                      valueFormat={(v) => `${v}%`}
                      color="purple"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">65% - 150%</p>
                  </div>

                  {/* Move Background (Vertical) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Move Background (Up/Down) NEW!</span>
                    </div>
                    <Slider
                      value={backgroundPositionY}
                      min={0}
                      max={100}
                      onChange={handleBackgroundPositionYChange}
                      showValue
                      valueFormat={(v) => `${v}%`}
                      color="purple"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">0% = Up, 100% = Down</p>
                  </div>

                  {/* Sound Toggle - only for video */}
                  {backgroundInfo?.type === 'video' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {backgroundSoundEnabled ? (
                            <Volume2 className="w-4 h-4 text-purple-500" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />
                          )}
                          <span className="text-xs text-[var(--text-secondary)]">Background Sound</span>
                        </div>
                        <button
                          onClick={handleSoundToggle}
                          className={cn(
                            'relative w-10 h-5 rounded-full transition-colors',
                            backgroundSoundEnabled ? 'bg-purple-500' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                          )}
                        >
                          <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', backgroundSoundEnabled ? 'left-5' : 'left-0.5')} />
                        </button>
                      </div>

                      {/* Volume Slider - only when sound is enabled */}
                      {backgroundSoundEnabled && (
                        <div className="space-y-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-muted)]">Volume</span>
                          </div>
                          <Slider
                            value={backgroundVolumeState}
                            min={0}
                            max={100}
                            step={5}
                            onChange={handleVolumeChange}
                            showValue
                            valueFormat={(v) => `${v}%`}
                            color="purple"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enable/Disable Background Toggle */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                      {backgroundEnabledState ? (
                        <Eye className="w-4 h-4 text-purple-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                      <div>
                        <span className="text-xs text-[var(--text-secondary)]">Background Enabled</span>
                        <p className="text-[10px] text-[var(--text-muted)]">Disable without deleting</p>
                      </div>
                    </div>
                    <button
                      onClick={handleBackgroundEnabledToggle}
                      className={cn(
                        'relative w-10 h-5 rounded-full transition-colors',
                        backgroundEnabledState ? 'bg-purple-500' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                      )}
                    >
                      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', backgroundEnabledState ? 'left-5' : 'left-0.5')} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SeasonalSettings;
