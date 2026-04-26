import { APP_EVENTS, dispatchAppEvent } from '@/shared/runtime';

import {
  ACCENT_COLOR_PRESETS,
  getUnifiedSettings,
  saveUnifiedSettings,
  type AccentColorType,
  type ResolvedTheme,
  type ThemeType,
} from './settings.model';

export function getTimeBasedTheme(): ResolvedTheme {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6 ? 'dark' : 'solarized';
}

export function getTheme(): ThemeType {
  if (typeof window === 'undefined') return 'auto';
  return getUnifiedSettings().theme;
}

export function getResolvedTheme(): ResolvedTheme {
  const theme = getTheme();
  return theme === 'auto' ? getTimeBasedTheme() : theme;
}

export function getAccentColor(): AccentColorType {
  if (typeof window === 'undefined') return 'coral';
  const saved = getUnifiedSettings().accentColor;
  return saved in ACCENT_COLOR_PRESETS ? saved : 'coral';
}

export function applyAccentColor(color: AccentColorType): void {
  if (typeof document === 'undefined') return;

  const preset = ACCENT_COLOR_PRESETS[color] ?? ACCENT_COLOR_PRESETS.coral;
  const resolvedTheme = getResolvedTheme();
  const palette = preset.byTheme?.[resolvedTheme] || preset.default;
  const root = document.documentElement;

  root.style.setProperty('--accent-primary', palette.primary);
  root.style.setProperty('--accent-secondary', palette.secondary);
  root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 100%)`);
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.remove('theme-light', 'theme-solarized', 'theme-dark');
  document.documentElement.classList.add(`theme-${theme}`);
  applyAccentColor(getAccentColor());
}

export function saveTheme(theme: ThemeType): void {
  if (typeof window === 'undefined') return;

  saveUnifiedSettings({ theme });
  applyTheme(theme === 'auto' ? getTimeBasedTheme() : theme);
  dispatchAppEvent(APP_EVENTS.themeChanged, { theme });
}

let autoThemeInterval: ReturnType<typeof setInterval> | null = null;
let lastAutoTheme: ResolvedTheme | null = null;

export function initTheme(): ResolvedTheme {
  const theme = getTheme();
  const resolved = theme === 'auto' ? getTimeBasedTheme() : theme;
  applyTheme(resolved);

  if (theme === 'auto' && typeof window !== 'undefined' && !autoThemeInterval) {
    lastAutoTheme = resolved;
    autoThemeInterval = setInterval(() => {
      if (getTheme() !== 'auto') {
        cleanupAutoTheme();
        return;
      }

      const nextTheme = getTimeBasedTheme();
      if (nextTheme !== lastAutoTheme) {
        lastAutoTheme = nextTheme;
        applyTheme(nextTheme);
        dispatchAppEvent(APP_EVENTS.themeChanged, { theme: 'auto', resolved: nextTheme });
      }
    }, 60000);
  }

  return resolved;
}

export function cleanupAutoTheme(): void {
  if (autoThemeInterval) {
    clearInterval(autoThemeInterval);
    autoThemeInterval = null;
  }
}

export function saveAccentColor(color: AccentColorType): void {
  if (typeof window === 'undefined') return;

  saveUnifiedSettings({ accentColor: color });
  applyAccentColor(color);
  dispatchAppEvent(APP_EVENTS.accentColorChanged, { color });
}

export function initAccentColor(): void {
  applyAccentColor(getAccentColor());
}
