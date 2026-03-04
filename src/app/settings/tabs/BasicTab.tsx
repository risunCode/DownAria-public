'use client';

import { motion } from 'framer-motion';
import { Beaker, Clock, Globe, Moon, Palette, RotateCcw, Sparkles, Sun } from 'lucide-react';
import { locales, localeFlags, localeNames } from '@/i18n/config';
import { ACCENT_COLOR_PRESETS, type AccentColorType, type LanguagePreference, type ThemeType } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

const THEMES: { id: ThemeType; icon: typeof Sun; labelKey: string; tipKey: string }[] = [
  { id: 'auto', icon: Clock, labelKey: 'theme.auto', tipKey: 'theme.autoTip' },
  { id: 'dark', icon: Moon, labelKey: 'theme.dark', tipKey: 'theme.darkTip' },
  { id: 'light', icon: Sun, labelKey: 'theme.light', tipKey: 'theme.lightTip' },
  { id: 'solarized', icon: Sparkles, labelKey: 'theme.solarized', tipKey: 'theme.solarizedTip' },
];

const ACCENT_COLORS: { id: AccentColorType; labelKey: string }[] = [
  { id: 'coral', labelKey: 'accentColors.coral' },
  { id: 'blue', labelKey: 'accentColors.blue' },
  { id: 'emerald', labelKey: 'accentColors.emerald' },
  { id: 'amber', labelKey: 'accentColors.amber' },
];

interface BasicTabProps {
  currentTheme: ThemeType;
  currentAccentColor: AccentColorType;
  resolvedAutoTheme: string;
  currentLanguage: LanguagePreference;
  canInstall: boolean;
  isInstalled: boolean;
  discordConfigured: boolean;
  onThemeChange: (theme: ThemeType) => void;
  onAccentColorChange: (color: AccentColorType) => void;
  onLanguageChange: (lang: LanguagePreference) => void;
  onInstallApp: () => void;
  onNavigateToIntegrations: () => void;
  onResetExperimentalValues: () => void;
  children?: React.ReactNode;
}

export function BasicTab({
  currentTheme,
  currentAccentColor,
  resolvedAutoTheme,
  currentLanguage,
  canInstall,
  isInstalled,
  discordConfigured,
  onThemeChange,
  onAccentColorChange,
  onLanguageChange,
  onInstallApp,
  onNavigateToIntegrations,
  onResetExperimentalValues,
  children,
}: BasicTabProps) {
  const t = useTranslations('settingsTabs.basic');

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
      <div className="glass-card p-6 rounded-2xl border border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-[var(--accent-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('language.title')}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onLanguageChange('auto')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              currentLanguage === 'auto'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="font-medium">{t('language.auto')}</span>
          </button>
          {locales.map(locale => (
            <button
              key={locale}
              onClick={() => onLanguageChange(locale)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                currentLanguage === locale
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
              }`}
            >
              <span>{localeFlags[locale]}</span>
              <span className="font-medium">{localeNames[locale]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="w-5 h-5 text-[var(--accent-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('theme.title')}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left bg-[var(--bg-card)]/35 ${
                currentTheme === theme.id
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                  : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]/50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <theme.icon className={`w-4 h-4 ${currentTheme === theme.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`} />
                  <span className={`text-sm font-medium ${currentTheme === theme.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                    {t(theme.labelKey)}
                    {theme.id === 'auto' && currentTheme === 'auto' && resolvedAutoTheme ? ` (${resolvedAutoTheme})` : ''}
                  </span>
                </div>
                {currentTheme === theme.id && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--accent-primary)] text-white text-[9px] font-medium">
                    {t('active')}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] pl-6">{t(theme.tipKey)}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('accentColor.title')}</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">{t('accentColor.description')}</p>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(color => (
              <button
                key={color.id}
                onClick={() => onAccentColorChange(color.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  currentAccentColor === color.id
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_COLOR_PRESETS[color.id].default.primary} 0%, ${ACCENT_COLOR_PRESETS[color.id].default.secondary} 100%)`,
                  }}
                />
                <span className="font-medium text-sm">{t(color.labelKey)}</span>
                {currentAccentColor === color.id && (
                  <span className="ml-1 text-[10px] bg-[var(--accent-primary)] text-white px-1.5 py-0.5 rounded">
                    {t('active')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-[var(--border-color)]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Beaker className="w-5 h-5 text-[var(--accent-primary)]" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('experimental.title')}</h2>
              <p className="text-xs text-[var(--text-muted)]">{t('experimental.description')}</p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onResetExperimentalValues}
            className="shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="ml-1.5">{t('experimental.resetAllValues')}</span>
          </Button>
        </div>

        <div className="space-y-4">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
