import { IS_DEV } from '@/shared/config';
import { type SeasonType } from '@/infra/storage/seasonal';

interface LogOptions {
  devOnly?: boolean;
}

function shouldLog(options?: LogOptions): boolean {
  return options?.devOnly ? IS_DEV : true;
}

function formatScope(scope: string): string {
  return `[${scope}]`;
}

export function createLogger(scope: string) {
  const prefix = formatScope(scope);

  return {
    debug(message: string, data?: unknown) {
      if (!IS_DEV) return;
      if (data === undefined) {
        console.log(prefix, message);
        return;
      }
      console.log(prefix, message, data);
    },
    warn(message: string, data?: unknown, options?: LogOptions) {
      if (!shouldLog(options)) return;
      if (data === undefined) {
        console.warn(prefix, message);
        return;
      }
      console.warn(prefix, message, data);
    },
    error(message: string, data?: unknown, options?: LogOptions) {
      if (!shouldLog(options)) return;
      if (data === undefined) {
        console.error(prefix, message);
        return;
      }
      console.error(prefix, message, data);
    },
  };
}

export const APP_EVENTS = {
  settingsChanged: 'settings-changed',
  seasonalSettingsChanged: 'seasonal-settings-changed',
  seasonalRandomChanged: 'seasonal-random-change',
  themeChanged: 'theme-changed',
  accentColorChanged: 'accent-color-changed',
  adaptTextChanged: 'adapt-text-changed',
} as const;

export interface AppEventPayloads {
  [APP_EVENTS.settingsChanged]: unknown;
  [APP_EVENTS.seasonalSettingsChanged]: undefined;
  [APP_EVENTS.seasonalRandomChanged]: { season: SeasonType };
  [APP_EVENTS.themeChanged]: { theme: string; resolved?: string };
  [APP_EVENTS.accentColorChanged]: { color: string };
  [APP_EVENTS.adaptTextChanged]: undefined;
}

export function dispatchAppEvent<TName extends keyof AppEventPayloads>(name: TName, detail?: AppEventPayloads[TName]): void {
  if (typeof window === 'undefined') return;

  if (detail === undefined) {
    window.dispatchEvent(new CustomEvent(name));
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}
