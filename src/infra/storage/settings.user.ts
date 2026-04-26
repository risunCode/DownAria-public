import { defaultLocale, locales, type Locale } from '@/i18n/config';

import { getEncrypted, removeEncrypted, setEncrypted } from './crypto';
import {
  DEFAULT_DISCORD,
  getUnifiedSettings,
  saveUnifiedSettings,
  type DiscordSettings,
  type LanguagePreference,
} from './settings.model';

const DISMISS_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const DISCORD_WEBHOOK_KEY = 'downaria_discord_webhook';

export function getLanguagePreference(): LanguagePreference {
  if (typeof window === 'undefined') return 'auto';
  return getUnifiedSettings().language;
}

export function setLanguagePreference(language: LanguagePreference): void {
  saveUnifiedSettings({ language });
}

export function getResolvedLocale(): Locale {
  const preference = getLanguagePreference();
  if (preference !== 'auto') return preference;

  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang && locales.includes(browserLang as Locale)) {
      return browserLang as Locale;
    }
  }

  return defaultLocale;
}

export function getDismissedAnnouncements(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  return getUnifiedSettings().dismissedAnnouncements;
}

export function dismissAnnouncement(id: string): void {
  const dismissed = { ...getDismissedAnnouncements(), [id]: Date.now() };
  saveUnifiedSettings({ dismissedAnnouncements: dismissed });
}

export function isAnnouncementDismissed(id: string): boolean {
  const dismissedAt = getDismissedAnnouncements()[id];
  return dismissedAt ? Date.now() - dismissedAt < DISMISS_COOLDOWN_MS : false;
}

export function getUpdateDismissed(): 'forever' | 'session' | null {
  if (typeof window === 'undefined') return null;
  return getUnifiedSettings().updateDismissed;
}

export function setUpdateDismissed(status: 'forever' | 'session' | null): void {
  saveUnifiedSettings({ updateDismissed: status });
}

export function getDiscordSettings(): DiscordSettings | null {
  if (typeof window === 'undefined') return null;
  return getUnifiedSettings().discord;
}

export function saveDiscordSettings(settings: DiscordSettings | null): void {
  saveUnifiedSettings({ discord: settings });
}

export function getUserDiscordSettings(): DiscordSettings | null {
  const discord = getDiscordSettings();
  if (!discord) return null;

  const encryptedWebhook = getEncrypted(DISCORD_WEBHOOK_KEY);

  return {
    ...DEFAULT_DISCORD,
    ...discord,
    webhookUrl: encryptedWebhook || discord.webhookUrl || '',
  };
}

export function saveUserDiscordSettings(settings: DiscordSettings): void {
  if (settings.webhookUrl) {
    setEncrypted(DISCORD_WEBHOOK_KEY, settings.webhookUrl);
  } else {
    removeEncrypted(DISCORD_WEBHOOK_KEY);
  }

  saveDiscordSettings({
    ...settings,
    webhookUrl: settings.webhookUrl ? '[encrypted]' : '',
  });
}
