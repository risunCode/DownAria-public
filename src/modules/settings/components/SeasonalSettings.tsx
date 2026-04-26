'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { SeasonalBackgroundPanel } from '@/modules/settings/components/seasonal/SeasonalBackgroundPanel';
import { SeasonalControls } from '@/modules/settings/components/seasonal/SeasonalControls';
import { SeasonalModeSelector } from '@/modules/settings/components/seasonal/SeasonalModeSelector';
import { SeasonalParticlesPanel } from '@/modules/settings/components/seasonal/SeasonalParticlesPanel';
import { useSeasonalSettingsForm } from '@/modules/settings/hooks/useSeasonalSettingsForm';

export function SeasonalSettings() {
  const t = useTranslations('settingsSeasonal');
  const {
    backgroundBlur,
    backgroundEnabledState,
    backgroundInfo,
    backgroundOpacity,
    backgroundPositionY,
    backgroundSoundEnabled,
    backgroundVolumeState,
    backgroundZoom,
    experimentalEnabled,
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
    hasBackground,
    isUploading,
    particleIntensity,
    particleOpacity,
    particleSpeed,
    seasonalMode,
  } = useSeasonalSettingsForm(t);

  return (
    <>
      <SeasonalControls
        enabled={experimentalEnabled}
        toggleTitle={t('toggleExperimental.title')}
        toggleDescription={t('toggleExperimental.description')}
        warningTitle={t('warning.title')}
        warningDescription={t('warning.description')}
        onToggle={handleExperimentalChange}
      />

      <AnimatePresence>
        {experimentalEnabled ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            <SeasonalModeSelector
              mode={seasonalMode}
              title={t('seasonalEffects.title')}
              description={t('seasonalEffects.description')}
              getLabel={(labelKey) => t(labelKey)}
              onChange={handleSeasonChange}
            />

            <SeasonalParticlesPanel
              intensity={particleIntensity}
              opacity={particleOpacity}
              speed={particleSpeed}
              labels={{
                intensity: t('seasonalEffects.particleIntensity'),
                intensityHint: t('seasonalEffects.particleIntensityHint'),
                speed: t('seasonalEffects.fallSpeed'),
                speedHint: t('seasonalEffects.fallSpeedHint'),
                opacity: t('seasonalEffects.particleOpacity'),
                opacityHint: t('seasonalEffects.particleOpacityHint'),
              }}
              onIntensityChange={handleParticleIntensityChange}
              onOpacityChange={handleParticleOpacityChange}
              onSpeedChange={handleParticleSpeedChange}
            />

            <SeasonalBackgroundPanel
              hasBackground={hasBackground}
              backgroundInfo={backgroundInfo}
              backgroundOpacity={backgroundOpacity}
              backgroundBlur={backgroundBlur}
              backgroundZoom={backgroundZoom}
              backgroundPositionY={backgroundPositionY}
              backgroundSoundEnabled={backgroundSoundEnabled}
              backgroundVolume={backgroundVolumeState}
              backgroundEnabled={backgroundEnabledState}
              isUploading={isUploading}
              fileInputRef={fileInputRef}
              formatFileSize={formatFileSize}
              labels={{
                title: t('customBackground.title'),
                emptyState: t('customBackground.emptyState'),
                image: t('customBackground.image'),
                video: t('customBackground.video'),
                upload: t('actions.upload'),
                change: t('actions.change'),
                visibility: t('backgroundControls.visibility'),
                visibilityHint: t('backgroundControls.visibilityHint'),
                blur: t('backgroundControls.blur'),
                zoom: t('backgroundControls.zoom'),
                zoomHint: t('backgroundControls.zoomHint'),
                moveVertical: t('backgroundControls.moveVertical'),
                moveVerticalHint: t('backgroundControls.moveVerticalHint'),
                sound: t('backgroundControls.sound'),
                volume: t('backgroundControls.volume'),
                enabled: t('backgroundControls.enabled'),
                enabledHint: t('backgroundControls.enabledHint'),
              }}
              onFileSelect={handleFileSelect}
              onRemoveBackground={handleRemoveBackground}
              onOpacityChange={handleOpacityChange}
              onBlurChange={handleBlurChange}
              onZoomChange={handleZoomChange}
              onPositionChange={handleBackgroundPositionYChange}
              onSoundToggle={handleSoundToggle}
              onVolumeChange={handleVolumeChange}
              onEnabledToggle={handleBackgroundEnabledToggle}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default SeasonalSettings;
