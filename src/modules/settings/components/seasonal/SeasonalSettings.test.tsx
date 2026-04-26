// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { seasonalState } = vi.hoisted(() => ({
  seasonalState: {
    backgroundBlur: 0,
    backgroundEnabledState: true,
    backgroundInfo: null,
    backgroundOpacity: 8,
    backgroundPositionY: 50,
    backgroundSoundEnabled: false,
    backgroundVolumeState: 50,
    backgroundZoom: 100,
    experimentalEnabled: true,
    fileInputRef: { current: null },
    formatFileSize: (value: number) => `${value} B`,
    handleBackgroundEnabledToggle: vi.fn(),
    handleBackgroundPositionYChange: vi.fn(),
    handleBlurChange: vi.fn(),
    handleExperimentalChange: vi.fn(),
    handleFileSelect: vi.fn(),
    handleOpacityChange: vi.fn(),
    handleParticleIntensityChange: vi.fn(),
    handleParticleOpacityChange: vi.fn(),
    handleParticleSpeedChange: vi.fn(),
    handleRemoveBackground: vi.fn(),
    handleSeasonChange: vi.fn(),
    handleSoundToggle: vi.fn(),
    handleVolumeChange: vi.fn(),
    handleZoomChange: vi.fn(),
    hasBackground: false,
    isUploading: false,
    particleIntensity: 50,
    particleOpacity: 50,
    particleSpeed: 100,
    seasonalMode: 'auto',
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/modules/settings/hooks/useSeasonalSettingsForm', () => ({
  useSeasonalSettingsForm: () => seasonalState,
}));

import SeasonalSettings from '../SeasonalSettings';

describe('SeasonalSettings', () => {
  it('renders seasonal panels when experimental mode is enabled', () => {
    render(<SeasonalSettings />);

    expect(screen.getByText('toggleExperimental.title')).toBeTruthy();
    expect(screen.getByText('warning.title')).toBeTruthy();
    expect(screen.getByText('seasonalEffects.title')).toBeTruthy();
    expect(screen.getByText('customBackground.title')).toBeTruthy();
  });
});
