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
  setParticleIntensity,
  setParticleOpacity,
  setParticleSpeed,
  processBackgroundFile,
  clearCustomBackground,
  formatFileSize,
  getUnifiedSettings,
  saveUnifiedSettings,
} from '@/lib/storage';
import { lazySwal } from '@/lib/utils/lazy-swal';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SEASON_OPTIONS: { id: 'auto' | 'random' | SeasonType; labelKey: string; emoji: string; icon: typeof Snowflake }[] = [
  { id: 'auto', labelKey: 'seasonOptions.auto', emoji: '✨', icon: Clock },
  { id: 'random', labelKey: 'seasonOptions.random', emoji: '🎲', icon: Sparkles },
  { id: 'winter', labelKey: 'seasonOptions.winter', emoji: '❄️', icon: Snowflake },
  { id: 'spring', labelKey: 'seasonOptions.spring', emoji: '🌸', icon: Flower2 },
  { id: 'autumn', labelKey: 'seasonOptions.autumn', emoji: '🍂', icon: Leaf },
  { id: 'off', labelKey: 'seasonOptions.off', emoji: '🌙', icon: Moon },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SeasonalSettings() {
  const t = useTranslations('settingsSeasonal');
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
  const [particleIntensity, setParticleIntensityState] = useState(50);
  const [particleOpacity, setParticleOpacityState] = useState(50);
  const [particleSpeed, setParticleSpeedState] = useState(100);
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
    setParticleIntensityState(settings.intensity ?? 50);
    setParticleOpacityState(settings.particleOpacity ?? 50);
    setParticleSpeedState(settings.particleSpeed ?? 100);
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
      setParticleIntensityState(s.intensity ?? 50);
      setParticleOpacityState(s.particleOpacity ?? 50);
      setParticleSpeedState(s.particleSpeed ?? 100);
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
      lazySwal.fire({
        icon: 'warning',
        title: t('alerts.highOpacity.title'),
        text: t('alerts.highOpacity.text'),
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

  const handleParticleIntensityChange = (value: number) => {
    setParticleIntensityState(value);
    setParticleIntensity(value);
  };

  const handleParticleSpeedChange = (value: number) => {
    setParticleSpeedState(value);
    setParticleSpeed(value);
  };

  const handleParticleOpacityChange = (value: number) => {
    setParticleOpacityState(value);
    setParticleOpacity(value);
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

      toast.success(t('alerts.backgroundSet.title'));
    } catch (err) {
      console.error('[SeasonalSettings] Failed to upload background:', err);
      toast.error(err instanceof Error ? err.message : t('alerts.uploadFailed.text'));
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
          <Sparkles className={cn('w-5 h-5', experimentalEnabled ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')} />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{t('toggleExperimental.title')}</p>
            <p className="text-xs text-[var(--text-muted)]">{t('toggleExperimental.description')}</p>
          </div>
        </div>
        <button
          onClick={() => handleExperimentalChange(!experimentalEnabled)}
          className={cn(
            'relative w-12 h-6 rounded-full shrink-0 transition-colors',
            experimentalEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
          )}
        >
          <span
            className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', experimentalEnabled ? 'translate-x-6' : 'translate-x-0')}
          />
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
                  <p className="text-sm font-medium text-amber-500">{t('warning.title')}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {t('warning.description')}
                  </p>
                </div>
              </div>
            </div>

            {/* Seasonal Effects */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/35 hover:border-[var(--accent-primary)]/50 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t('seasonalEffects.title')}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t('seasonalEffects.description')}</p>
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
                        ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
                    )}
                    >
                      <span className="text-lg">{option.emoji}</span>
                      <span className="text-[10px] font-medium">{t(option.labelKey)}</span>
                    </button>
                ))}
              </div>

              <div className="space-y-4 mt-4 pt-4 border-t border-[var(--border-color)]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-secondary)]">{t('seasonalEffects.particleIntensity')}</span>
                  </div>
                  <Slider
                    value={particleIntensity}
                    min={0}
                    max={200}
                    onChange={handleParticleIntensityChange}
                    showValue
                    valueFormat={(v) => `${v}%`}
                    color="blue"
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">{t('seasonalEffects.particleIntensityHint')}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-secondary)]">{t('seasonalEffects.fallSpeed')}</span>
                  </div>
                  <Slider
                    value={particleSpeed}
                    min={50}
                    max={150}
                    onChange={handleParticleSpeedChange}
                    showValue
                    valueFormat={(v) => `${v}%`}
                    color="blue"
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">{t('seasonalEffects.fallSpeedHint')}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-secondary)]">{t('seasonalEffects.particleOpacity')}</span>
                  </div>
                  <Slider
                    value={particleOpacity}
                    min={10}
                    max={100}
                    onChange={handleParticleOpacityChange}
                    showValue
                    valueFormat={(v) => `${v}%`}
                    color="blue"
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">{t('seasonalEffects.particleOpacityHint')}</p>
                </div>
              </div>
            </div>

            {/* Custom Background */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {hasBackground ? (
                    backgroundInfo?.type === 'video' ? (
                      <Video className="w-5 h-5 text-[var(--accent-primary)]" />
                    ) : (
                      <Image className="w-5 h-5 text-[var(--accent-primary)]" />
                    )
                  ) : (
                    <Image className="w-5 h-5 text-[var(--text-muted)]" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{t('customBackground.title')}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {hasBackground && backgroundInfo
                        ? `${backgroundInfo.type === 'video' ? t('customBackground.video') : t('customBackground.image')} - ${formatFileSize(backgroundInfo.size)}`
                        : t('customBackground.emptyState')}
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
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('actions.change')}
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
                    {t('actions.upload')}
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
                      <span className="text-xs text-[var(--text-secondary)]">{t('backgroundControls.visibility')}</span>
                    </div>
                    <Slider
                      value={backgroundOpacity}
                      min={0}
                      max={40}
                      onChange={handleOpacityChange}
                      showValue
                      valueFormat={(v) => `${v}%`}
                      color="blue"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">{t('backgroundControls.visibilityHint')}</p>
                  </div>

                  {/* Blur Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">{t('backgroundControls.blur')}</span>
                    </div>
                    <Slider
                      value={backgroundBlur}
                      min={0}
                      max={20}
                      onChange={handleBlurChange}
                      showValue
                      valueFormat={(v) => `${v}px`}
                      color="blue"
                    />
                  </div>

                  {/* Zoom Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ZoomIn className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">{t('backgroundControls.zoom')}</span>
                    </div>
                    <Slider
                      value={backgroundZoom}
                      min={65}
                      max={150}
                      onChange={handleZoomChange}
                      showValue
                      valueFormat={(v) => `${v}%`}
                      color="blue"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">{t('backgroundControls.zoomHint')}</p>
                  </div>

                  {/* Move Background (Vertical) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">{t('backgroundControls.moveVertical')}</span>
                    </div>
                    <Slider
                      value={backgroundPositionY}
                      min={0}
                      max={100}
                      onChange={handleBackgroundPositionYChange}
                      showValue
                      valueFormat={(v) => `${v}%`}
                      color="blue"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">{t('backgroundControls.moveVerticalHint')}</p>
                  </div>

                  {/* Sound Toggle - only for video */}
                  {backgroundInfo?.type === 'video' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {backgroundSoundEnabled ? (
                            <Volume2 className="w-4 h-4 text-[var(--accent-primary)]" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />
                          )}
                          <span className="text-xs text-[var(--text-secondary)]">{t('backgroundControls.sound')}</span>
                        </div>
                        <button
                          onClick={handleSoundToggle}
                          className={cn(
                            'relative w-12 h-6 rounded-full shrink-0 transition-colors',
                            backgroundSoundEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                          )}
                        >
                          <span
                            className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', backgroundSoundEnabled ? 'translate-x-6' : 'translate-x-0')}
                          />
                        </button>
                      </div>

                      {/* Volume Slider - only when sound is enabled */}
                      {backgroundSoundEnabled && (
                        <div className="space-y-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-muted)]">{t('backgroundControls.volume')}</span>
                          </div>
                          <Slider
                            value={backgroundVolumeState}
                            min={0}
                            max={100}
                            step={5}
                            onChange={handleVolumeChange}
                            showValue
                            valueFormat={(v) => `${v}%`}
                            color="blue"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enable/Disable Background Toggle */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                      {backgroundEnabledState ? (
                         <Eye className="w-4 h-4 text-[var(--accent-primary)]" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                      <div>
                        <span className="text-xs text-[var(--text-secondary)]">{t('backgroundControls.enabled')}</span>
                        <p className="text-[10px] text-[var(--text-muted)]">{t('backgroundControls.enabledHint')}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleBackgroundEnabledToggle}
                      className={cn(
                        'relative w-12 h-6 rounded-full shrink-0 transition-colors',
                        backgroundEnabledState ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                      )}
                    >
                      <span
                        className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', backgroundEnabledState ? 'translate-x-6' : 'translate-x-0')}
                      />
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
