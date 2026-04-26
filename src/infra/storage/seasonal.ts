/**
 * Seasonal settings persistence and mutation helpers.
 */

import { deleteBackgroundBlob } from './seasonal.background';
import { STORAGE_KEYS } from './settings.model';
import { APP_EVENTS, dispatchAppEvent } from '@/shared/runtime';

export type SeasonType = 'winter' | 'spring' | 'autumn' | 'locks' | 'off';

export const ACTIVE_SEASONS: SeasonType[] = ['winter', 'spring', 'autumn', 'locks'];

export type BackgroundType = 'image' | 'video';

export interface BackgroundPosition {
  x: number;
  y: number;
  scale: number;
}

export interface CustomBackground {
  type: BackgroundType;
  data: string;
  mimeType: string;
  size: number;
  position: BackgroundPosition;
}

export interface SeasonalSettings {
  mode: 'auto' | 'random' | SeasonType;
  season: SeasonType;
  customBackground: CustomBackground | null;
  particlesWithBackground: boolean;
  intensity: number;
  particleOpacity: number;
  particleSpeed: number;
  backgroundOpacity: number;
  cardOpacity: number;
  backgroundBlur: number;
  backgroundZoom: number;
  backgroundSound: boolean;
  backgroundVolume: number;
  backgroundEnabled: boolean;
  randomInterval: number;
}

export const DEFAULT_BACKGROUND_POSITION: BackgroundPosition = { x: 50, y: 50, scale: 1 };

export const DEFAULT_SEASONAL_SETTINGS: SeasonalSettings = {
  mode: 'auto',
  season: 'off',
  customBackground: null,
  particlesWithBackground: true,
  intensity: 50,
  particleOpacity: 40,
  particleSpeed: 100,
  backgroundOpacity: 20,
  cardOpacity: 85,
  backgroundBlur: 0,
  backgroundZoom: 100,
  backgroundSound: false,
  backgroundVolume: 50,
  backgroundEnabled: true,
  randomInterval: 30,
};

export function getCurrentSeason(): SeasonType {
  return 'locks';
}

export function getRandomSeason(): SeasonType {
  const randomIndex = Math.floor(Math.random() * ACTIVE_SEASONS.length);
  return ACTIVE_SEASONS[randomIndex];
}

let randomModeInterval: ReturnType<typeof setInterval> | null = null;
let currentRandomSeason: SeasonType = getRandomSeason();

export function startRandomRotation(intervalSeconds: number = 30): void {
  stopRandomRotation();
  currentRandomSeason = getRandomSeason();

  randomModeInterval = setInterval(() => {
    let nextSeason: SeasonType;
    do {
      nextSeason = getRandomSeason();
    } while (nextSeason === currentRandomSeason && ACTIVE_SEASONS.length > 1);

    currentRandomSeason = nextSeason;
    dispatchAppEvent(APP_EVENTS.seasonalRandomChanged, { season: currentRandomSeason });
  }, intervalSeconds * 1000);
}

export function stopRandomRotation(): void {
  if (randomModeInterval) {
    clearInterval(randomModeInterval);
    randomModeInterval = null;
  }
}

export function getCurrentRandomSeason(): SeasonType {
  return currentRandomSeason;
}

const SEASONAL_KEY = STORAGE_KEYS.SEASONAL;

function resolveSeason(settings: SeasonalSettings): SeasonalSettings {
  if (settings.mode === 'auto') {
    return { ...settings, season: getCurrentSeason() };
  }
  if (settings.mode === 'random') {
    return { ...settings, season: getCurrentRandomSeason() };
  }
  if (settings.mode === 'off') {
    return { ...settings, season: 'off' };
  }
  return { ...settings, season: settings.mode };
}

function emitSeasonalSettingsChange(nextSettings: SeasonalSettings): void {
  window.dispatchEvent(new StorageEvent('storage', {
    key: SEASONAL_KEY,
    newValue: JSON.stringify(nextSettings),
  }));

  dispatchAppEvent(APP_EVENTS.seasonalSettingsChanged);
}

export function getSeasonalSettings(): SeasonalSettings {
  if (typeof window === 'undefined') {
    return resolveSeason({ ...DEFAULT_SEASONAL_SETTINGS });
  }

  try {
    const saved = localStorage.getItem(SEASONAL_KEY);
    if (saved) {
      return resolveSeason({
        ...DEFAULT_SEASONAL_SETTINGS,
        ...(JSON.parse(saved) as Partial<SeasonalSettings>),
      });
    }
  } catch {
    // Ignore malformed storage values and fall back to defaults.
  }

  return resolveSeason({ ...DEFAULT_SEASONAL_SETTINGS });
}

export function saveSeasonalSettings(settings: Partial<SeasonalSettings>): void {
  if (typeof window === 'undefined') return;

  const currentSettings = getSeasonalSettings();
  const nextSettings = resolveSeason({ ...currentSettings, ...settings });

  if (settings.mode !== undefined) {
    if (currentSettings.mode === 'random' && settings.mode !== 'random') {
      stopRandomRotation();
    }

    if (settings.mode === 'random' && currentSettings.mode !== 'random') {
      startRandomRotation(nextSettings.randomInterval);
    }
  }

  localStorage.setItem(SEASONAL_KEY, JSON.stringify(nextSettings));
  emitSeasonalSettingsChange(nextSettings);
}

export function setSeasonalMode(mode: 'auto' | 'random' | SeasonType): void {
  saveSeasonalSettings({ mode });
}

export function setCustomBackground(background: CustomBackground | null): void {
  saveSeasonalSettings({ customBackground: background });
}

export function setBackgroundPosition(position: Partial<BackgroundPosition>): void {
  const currentSettings = getSeasonalSettings();
  if (!currentSettings.customBackground) return;

  saveSeasonalSettings({
    customBackground: {
      ...currentSettings.customBackground,
      position: { ...currentSettings.customBackground.position, ...position },
    },
  });
}

export function setBackgroundOpacity(opacity: number): void {
  saveSeasonalSettings({ backgroundOpacity: Math.max(0, Math.min(100, opacity)) });
}

export function setBackgroundBlur(blur: number): void {
  saveSeasonalSettings({ backgroundBlur: Math.max(0, Math.min(20, blur)) });
}

export function setBackgroundZoom(zoom: number): void {
  saveSeasonalSettings({ backgroundZoom: Math.max(65, Math.min(150, zoom)) });
}

export function setBackgroundSound(enabled: boolean): void {
  saveSeasonalSettings({ backgroundSound: enabled });
}

export function setBackgroundVolume(volume: number): void {
  saveSeasonalSettings({ backgroundVolume: Math.max(0, Math.min(100, volume)) });
}

export function setBackgroundEnabled(enabled: boolean): void {
  saveSeasonalSettings({ backgroundEnabled: enabled });
}

export function setParticleIntensity(intensity: number): void {
  saveSeasonalSettings({ intensity: Math.max(0, Math.min(200, intensity)) });
}

export function setParticleOpacity(opacity: number): void {
  saveSeasonalSettings({ particleOpacity: Math.max(10, Math.min(100, opacity)) });
}

export function setParticleSpeed(speed: number): void {
  saveSeasonalSettings({ particleSpeed: Math.max(50, Math.min(150, speed)) });
}

export function resetSeasonalSettings(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEASONAL_KEY);
}

export async function clearCustomBackground(): Promise<void> {
  await deleteBackgroundBlob();
  setCustomBackground(null);
}
