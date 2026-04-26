// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  ACCENT_COLOR_PRESETS,
  DEFAULT_DISCORD,
  STORAGE_KEYS,
  getUnifiedSettings,
} from './settings.model';
import { saveAccentColor, saveTheme } from './settings.theme';
import { getResolvedLocale, getUserDiscordSettings, saveUserDiscordSettings } from './settings.user';

describe('settings storage correctness', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    Object.defineProperty(window.navigator, 'language', {
      value: 'id-ID',
      configurable: true,
    });
  });

  it('falls back to defaults when stored settings are malformed', () => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, '{bad-json');

    const settings = getUnifiedSettings();

    expect(settings.theme).toBe('auto');
    expect(settings.accentColor).toBe('coral');
    expect(settings.experimentalEnabled).toBe(true);
  });

  it('persists theme changes and applies the matching document class', () => {
    saveTheme('dark');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');

    expect(stored.theme).toBe('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
  });

  it('persists accent color and updates CSS variables', () => {
    saveAccentColor('amber');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
    const palette = ACCENT_COLOR_PRESETS.amber.default;

    expect(stored.accentColor).toBe('amber');
    expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe(palette.primary);
    expect(document.documentElement.style.getPropertyValue('--accent-secondary')).toBe(palette.secondary);
    expect(document.documentElement.style.getPropertyValue('--accent-gradient')).toContain(palette.primary);
  });

  it('resolves locale from the browser when preference is auto', () => {
    expect(getResolvedLocale()).toBe('id');
  });

  it('stores Discord webhook encrypted while returning the decrypted user settings', () => {
    const webhookUrl = 'https://discord.com/api/webhooks/123/test';

    saveUserDiscordSettings({
      ...DEFAULT_DISCORD,
      webhookUrl,
      enabled: true,
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
    const userSettings = getUserDiscordSettings();

    expect(stored.discord.webhookUrl).toBe('[encrypted]');
    expect(userSettings?.webhookUrl).toBe(webhookUrl);
  });
});
