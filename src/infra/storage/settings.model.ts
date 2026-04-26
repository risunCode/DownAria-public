import { type Locale } from '@/i18n/config';
import { APP_EVENTS, dispatchAppEvent } from '@/shared/runtime';

export const STORAGE_KEYS = {
  SETTINGS: 'downaria_settings',
  COOKIES: 'downaria_cookies',
  SEASONAL: 'downaria_seasonal',
} as const;

export type ThemeType = 'auto' | 'light' | 'solarized' | 'dark';
export type ResolvedTheme = 'light' | 'solarized' | 'dark';
export type LanguagePreference = 'auto' | Locale;
export type CookiePlatform = 'facebook' | 'instagram' | 'twitter' | 'youtube';
export type AccentColorType = 'coral' | 'blue' | 'emerald' | 'amber';

export interface DiscordSettings {
  enabled: boolean;
  webhookUrl: string;
  autoSend: boolean;
  embedEnabled: boolean;
  embedColor: string;
  footerText: string;
  sendMethod: 'smart' | 'single' | 'double';
  mention: string;
  sendAllOnBatch: boolean;
  batchDelay: number;
}

export interface DownAriaSettings {
  theme: ThemeType;
  accentColor: AccentColorType;
  language: LanguagePreference;
  adaptText: boolean;
  highlightLevel: number;
  preferredQuality: 'highest' | 'hd' | 'sd';
  autoDownload: boolean;
  showEngagement: boolean;
  videoSound: boolean;
  experimentalAudioConvert?: boolean;
  experimentalEnabled: boolean;
  wallpaperOpacity: number;
  backgroundBlur: number;
  allowLargeBackground: boolean;
  customBackgroundEnabled: boolean;
  backgroundSound: boolean;
  notifications: boolean;
  updateDismissed: 'forever' | 'session' | null;
  dismissedAnnouncements: Record<string, number>;
  discord: DiscordSettings | null;
}

export const DEFAULT_DISCORD: DiscordSettings = {
  enabled: true,
  webhookUrl: '',
  autoSend: false,
  embedEnabled: true,
  embedColor: '#f3d61b',
  footerText: 'via DownAria',
  sendMethod: 'double',
  mention: '',
  sendAllOnBatch: false,
  batchDelay: 2000,
};

type AccentPalette = { primary: string; secondary: string };
type AccentPreset = { label: string; default: AccentPalette; byTheme?: Partial<Record<ResolvedTheme, AccentPalette>> };

export const ACCENT_COLOR_PRESETS: Record<AccentColorType, AccentPreset> = {
  coral: {
    label: 'New Color (Coral)',
    default: { primary: '#e85d4a', secondary: '#f97316' },
  },
  blue: {
    label: 'Old DownAria',
    default: { primary: '#6366f1', secondary: '#8b5cf6' },
    byTheme: {
      light: { primary: '#6366f1', secondary: '#8b5cf6' },
      solarized: { primary: '#5046e5', secondary: '#7c3aed' },
      dark: { primary: '#58a6ff', secondary: '#79c0ff' },
    },
  },
  emerald: {
    label: 'Emerald',
    default: { primary: '#10b981', secondary: '#34d399' },
  },
  amber: {
    label: 'Amber',
    default: { primary: '#f59e0b', secondary: '#fbbf24' },
  },
};

const DEFAULT_SETTINGS: DownAriaSettings = {
  theme: 'auto',
  accentColor: 'coral',
  language: 'auto',
  adaptText: false,
  highlightLevel: 0,
  preferredQuality: 'highest',
  autoDownload: false,
  showEngagement: true,
  videoSound: false,
  experimentalEnabled: true,
  wallpaperOpacity: 8,
  backgroundBlur: 0,
  allowLargeBackground: false,
  customBackgroundEnabled: true,
  backgroundSound: false,
  notifications: false,
  updateDismissed: null,
  dismissedAnnouncements: {},
  discord: null,
};

export function getUnifiedSettings(): DownAriaSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUnifiedSettings(settings: Partial<DownAriaSettings>): void {
  if (typeof window === 'undefined') return;

  const updated = { ...getUnifiedSettings(), ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  dispatchAppEvent(APP_EVENTS.settingsChanged, updated);
}

export function resetUnifiedSettings(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  dispatchAppEvent(APP_EVENTS.settingsChanged, DEFAULT_SETTINGS);
}
