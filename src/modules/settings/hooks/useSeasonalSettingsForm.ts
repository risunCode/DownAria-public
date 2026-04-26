'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  clearCustomBackground,
  formatFileSize,
  getSeasonalSettings,
  getUnifiedSettings,
  processBackgroundFile,
  saveSeasonalSettings,
  saveUnifiedSettings,
  setBackgroundBlur,
  setBackgroundEnabled,
  setBackgroundOpacity,
  setBackgroundPosition,
  setBackgroundSound,
  setBackgroundVolume,
  setBackgroundZoom,
  setParticleIntensity,
  setParticleOpacity,
  setParticleSpeed,
  setSeasonalMode,
  type SeasonType,
} from '@/modules/settings/services';
import { APP_EVENTS, createLogger } from '@/shared/runtime';
import { lazySwal } from '@/shared/utils/lazy-swal';

const seasonalSettingsLogger = createLogger('SeasonalSettings');

export interface SeasonalBackgroundInfo {
  type: string;
  size: number;
}

interface SeasonalTranslations {
  (key: string): string;
}

export function useSeasonalSettingsForm(t: SeasonalTranslations) {
  const [experimentalEnabled, setExperimentalEnabled] = useState(true);
  const [seasonalMode, setSeasonalModeState] = useState<'auto' | 'random' | SeasonType>('auto');
  const [hasBackground, setHasBackground] = useState(false);
  const [backgroundInfo, setBackgroundInfo] = useState<SeasonalBackgroundInfo | null>(null);
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

  useEffect(() => {
    const syncState = () => {
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
        setBackgroundInfo({ type: settings.customBackground.type, size: settings.customBackground.size });
      } else {
        setHasBackground(false);
        setBackgroundInfo(null);
      }
    };

    syncState();
    window.addEventListener(APP_EVENTS.seasonalSettingsChanged, syncState);
    return () => window.removeEventListener(APP_EVENTS.seasonalSettingsChanged, syncState);
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
      void lazySwal.fire({
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
    const nextValue = !backgroundSoundEnabled;
    setBackgroundSoundEnabled(nextValue);
    setBackgroundSound(nextValue);
  };

  const handleVolumeChange = (value: number) => {
    setBackgroundVolumeState(value);
    setBackgroundVolume(value);
  };

  const handleBackgroundEnabledToggle = () => {
    const nextValue = !backgroundEnabledState;
    setBackgroundEnabledState(nextValue);
    setBackgroundEnabled(nextValue);
  };

  const handleParticleIntensityChange = (value: number) => {
    setParticleIntensityState(value);
    setParticleIntensity(value);
  };

  const handleParticleOpacityChange = (value: number) => {
    setParticleOpacityState(value);
    setParticleOpacity(value);
  };

  const handleParticleSpeedChange = (value: number) => {
    setParticleSpeedState(value);
    setParticleSpeed(value);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const background = await processBackgroundFile(file);
      // Add a timestamp version to force listeners to reload from DB
      if (background) {
        background.version = Date.now();
      }
      saveSeasonalSettings({ customBackground: background });
      setHasBackground(true);
      setBackgroundInfo({ type: background.type, size: background.size });
      toast.success(t('alerts.backgroundSet.title'));
    } catch (error) {
      seasonalSettingsLogger.error('Failed to upload background', error, { devOnly: true });
      toast.error(error instanceof Error ? error.message : t('alerts.uploadFailed.text'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackground = async () => {
    await clearCustomBackground();
    setHasBackground(false);
    setBackgroundInfo(null);
  };

  return {
    experimentalEnabled,
    seasonalMode,
    hasBackground,
    backgroundInfo,
    backgroundOpacity,
    backgroundBlur,
    backgroundZoom,
    backgroundPositionY,
    backgroundSoundEnabled,
    backgroundVolumeState,
    backgroundEnabledState,
    particleIntensity,
    particleOpacity,
    particleSpeed,
    isUploading,
    fileInputRef,
    formatFileSize,
    handleBackgroundEnabledToggle,
    handleBackgroundPositionYChange,
    handleBlurChange,
    handleExperimentalChange,
    handleFileSelect,
    handleOpacityChange,
    handleParticleIntensityChange,
    handleParticleOpacityChange,
    handleParticleSpeedChange,
    handleRemoveBackground,
    handleSeasonChange,
    handleSoundToggle,
    handleVolumeChange,
    handleZoomChange,
  };
}
