// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteBackgroundBlob: vi.fn(async () => undefined),
}));

vi.mock('./seasonal.background', () => ({
  deleteBackgroundBlob: mocks.deleteBackgroundBlob,
}));

import { ACTIVE_SEASONS, clearCustomBackground, getSeasonalSettings, saveSeasonalSettings, setBackgroundZoom, setParticleSpeed } from './seasonal';
import { STORAGE_KEYS } from './settings.model';

describe('seasonal storage correctness', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.deleteBackgroundBlob.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-04-10T10:00:00Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('resolves auto mode to the current season when nothing is stored', () => {
    const settings = getSeasonalSettings();

    expect(settings.mode).toBe('auto');
    expect(settings.season).toBe('locks');
  });

  it('stores random mode with a randomized season', () => {
    saveSeasonalSettings({ mode: 'random' });

    const storedRandom = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEASONAL) || '{}');

    expect(storedRandom.mode).toBe('random');
    expect(ACTIVE_SEASONS).toContain(storedRandom.season);
  });

  it('clamps helper values before persisting them', () => {
    setBackgroundZoom(999);
    setParticleSpeed(10);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEASONAL) || '{}');

    expect(stored.backgroundZoom).toBe(150);
    expect(stored.particleSpeed).toBe(50);
  });

  it('clears custom background state after deleting the stored blob', async () => {
    saveSeasonalSettings({
      customBackground: {
        type: 'image',
        data: 'blob:test',
        mimeType: 'image/png',
        size: 1234,
        position: { x: 50, y: 50, scale: 1 },
      },
    });

    await clearCustomBackground();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEASONAL) || '{}');

    expect(mocks.deleteBackgroundBlob).toHaveBeenCalledTimes(1);
    expect(stored.customBackground).toBeNull();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
