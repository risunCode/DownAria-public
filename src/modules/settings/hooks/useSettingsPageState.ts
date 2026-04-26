'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useLocaleRefresh } from '@/components/core/IntlProvider';
import { 
  downloadFullBackupAsZip, 
  getHistoryCount, 
  importFullBackupFromZip,
  clearScraperCache
} from '@/modules/history/services';
import {
  clearAllCookies,
  clearPlatformCookie,
  deleteBackgroundBlob,
  getAccentColor,
  getAllCookieStatus,
  getLanguagePreference,
  getTheme,
  getTimeBasedTheme,
  getUnifiedSettings,
  getUserDiscordSettings,
  parseCookieInputToFlat,
  resetSeasonalSettings,
  saveAccentColor,
  savePlatformCookie,
  saveTheme,
  saveUnifiedSettings,
  setLanguagePreference,
  type AccentColorType,
  type CookiePlatform,
  type LanguagePreference,
  type ThemeType,
} from '@/modules/settings/services';
import { clearAllClientData, deleteAllIndexedDbDatabases } from '@/modules/settings/services/browser-maintenance';
import { APP_EVENTS, dispatchAppEvent } from '@/shared/runtime';
import { lazySwal } from '@/shared/utils/lazy-swal';

export type TabId = 'basic' | 'cookies' | 'storage' | 'integrations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function useSettingsPageState() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tPage = useTranslations('settingsPage');
  const refreshLocale = useLocaleRefresh();

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('dark');
  const [currentAccentColor, setCurrentAccentColor] = useState<AccentColorType>('coral');
  const [resolvedAutoTheme, setResolvedAutoTheme] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState<LanguagePreference>('auto');
  const [userCookies, setUserCookies] = useState<Record<CookiePlatform, boolean>>({
    facebook: false,
    instagram: false,
    twitter: false,
    youtube: false,
  });
  const [editPlatform, setEditPlatform] = useState<CookiePlatform | null>(null);
  const [editValue, setEditValue] = useState('');
  const [historyCount, setHistoryCount] = useState(0);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [discordConfigured, setDiscordConfigured] = useState(false);
  const [isClearing, setIsClearing] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const tabTitles: Record<TabId, string> = {
    basic: tPage('tabs.basic.title'),
    cookies: tPage('tabs.cookies.title'),
    storage: tPage('tabs.storage.title'),
    integrations: tPage('tabs.integrations.title'),
  };

  const refreshHistoryCount = useCallback(async () => {
    const count = await getHistoryCount().catch(() => 0);
    setHistoryCount(count);
  }, []);

  useEffect(() => {
    setCurrentTheme(getTheme());
    setResolvedAutoTheme(getTimeBasedTheme());
    setCurrentAccentColor(getAccentColor());
    setCurrentLanguage(getLanguagePreference());
    setUserCookies(getAllCookieStatus());
    void refreshHistoryCount();

    const discordSettings = getUserDiscordSettings();
    setDiscordConfigured(Boolean(discordSettings?.webhookUrl));

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsInstalled(standalone);
    if (standalone) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [refreshHistoryCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab === 'basic' || requestedTab === 'cookies' || requestedTab === 'storage' || requestedTab === 'integrations') {
      setActiveTab(requestedTab);
    }
  }, []);

  const handleThemeChange = useCallback((theme: ThemeType) => {
    saveTheme(theme);
    setCurrentTheme(theme);
  }, []);

  const handleAccentColorChange = useCallback((color: AccentColorType) => {
    saveAccentColor(color);
    setCurrentAccentColor(color);
  }, []);

  const handleLanguageChange = useCallback((language: LanguagePreference) => {
    setLanguagePreference(language);
    setCurrentLanguage(language);
    refreshLocale();
  }, [refreshLocale]);

  const handleInstallApp = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
      setIsInstalled(true);
      toast.success(`${tPage('alerts.installSuccess.title')} – ${tPage('alerts.installSuccess.text')}`);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt, tPage]);

  const handleSaveCookie = useCallback((platform: CookiePlatform) => {
    if (!editValue.trim()) return;

    try {
      const flatCookie = parseCookieInputToFlat(editValue.trim(), platform);
      savePlatformCookie(platform, flatCookie);
      setUserCookies(getAllCookieStatus());
      setEditPlatform(null);
      setEditValue('');
      toast.success(t('cookies.saved'));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message === 'No valid cookies found'
            ? tPage('alerts.cookies.noValidCookies')
            : error.message === 'Invalid cookie format'
              ? tPage('alerts.cookies.invalidCookieFormat')
              : error.message
          : tPage('alerts.unknownError')
      );
    }
  }, [editValue, t, tPage]);

  const handleClearCookie = useCallback((platform: CookiePlatform) => {
    clearPlatformCookie(platform);
    setUserCookies(getAllCookieStatus());
  }, []);

  const clearAllCookiesHandler = useCallback(async () => {
    const result = await lazySwal.fire({
      icon: 'warning',
      title: t('storage.clear.cookies'),
      text: t('storage.clear.cookiesDesc'),
      showCancelButton: true,
      confirmButtonText: tCommon('clear'),
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    setIsClearing('cookies');
    clearAllCookies();
    setUserCookies(getAllCookieStatus());
    setIsClearing(null);
    toast.success(t('cookies.cleared'));
  }, [t, tCommon]);

  const clearLocalStorage = useCallback(async () => {
    const result = await lazySwal.fire({
      icon: 'warning',
      title: t('storage.clear.localStorage'),
      text: t('storage.clear.localStorageDesc'),
      showCancelButton: true,
      confirmButtonText: tCommon('clear'),
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    setIsClearing('localstorage');
    localStorage.clear();
    toast.success(tPage('alerts.cleared'));
    window.location.reload();
  }, [t, tCommon, tPage]);

  const clearIndexedDB = useCallback(async () => {
    const result = await lazySwal.fire({
      icon: 'warning',
      title: tPage('alerts.indexedDbClear.title'),
      html: `<p>${escapeHtml(tPage('alerts.indexedDbClear.text'))}</p><p class="text-sm mt-2 text-red-400">${escapeHtml(tPage('alerts.indexedDbClear.warning'))}</p>`,
      showCancelButton: true,
      confirmButtonText: tPage('alerts.indexedDbClear.confirm'),
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    setIsClearing('indexeddb');
    try {
      await deleteAllIndexedDbDatabases();
      setHistoryCount(0);
      toast.success(tPage('alerts.indexedDbClear.success'));
    } finally {
      setIsClearing(null);
    }
  }, [tPage]);

  const clearSeasonalData = useCallback(async () => {
    const result = await lazySwal.fire({
      icon: 'warning',
      title: tPage('alerts.seasonalClear.title'),
      text: tPage('alerts.seasonalClear.text'),
      showCancelButton: true,
      confirmButtonText: tCommon('clear'),
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    setIsClearing('seasonal');
    try {
      await deleteBackgroundBlob();
      resetSeasonalSettings();
      toast.success(tPage('alerts.seasonalClear.success'));
    } finally {
      setIsClearing(null);
    }
  }, [tCommon, tPage]);

  const handleClearScraperCache = useCallback(async () => {
    const result = await lazySwal.fire({
      icon: 'warning',
      title: tPage('alerts.scraperCacheClear.title'),
      text: tPage('alerts.scraperCacheClear.text'),
      showCancelButton: true,
      confirmButtonText: tCommon('clear'),
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    setIsClearing('scraper');
    try {
      await clearScraperCache();
      toast.success(tPage('alerts.scraperCacheClear.success'));
    } finally {
      setIsClearing(null);
    }
  }, [tCommon, tPage]);

  const handleResetExperimentalValues = useCallback(async () => {
    const result = await lazySwal.fire({
      icon: 'warning',
      title: tPage('alerts.experimentalReset.title'),
      text: tPage('alerts.experimentalReset.text'),
      showCancelButton: true,
      confirmButtonText: tPage('alerts.experimentalReset.confirm'),
      confirmButtonColor: '#f97316',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteBackgroundBlob();
      resetSeasonalSettings();
      saveUnifiedSettings({ experimentalEnabled: true });
      dispatchAppEvent(APP_EVENTS.seasonalSettingsChanged);
      dispatchAppEvent(APP_EVENTS.settingsChanged);
      toast.success(tPage('alerts.experimentalReset.success'));
    } catch {
      toast.error(tPage('alerts.experimentalReset.failed'));
    }
  }, [tPage]);

    const handleExportBackup = useCallback(async () => {
      setIsExporting(true);
      try {
        await downloadFullBackupAsZip();
        toast.success(`${t('storage.backup.exportSuccess')} – ${t('storage.backup.exportSuccessDesc')}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('storage.backup.exportFailed'));
      } finally {
        setIsExporting(false);
      }
    }, [t]);

  const handleImportBackup = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error(`${tPage('backup.invalidFileTitle')}: ${t('storage.backup.invalidFile')}`);
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = '';
      }
      return;
    }

    const result = await lazySwal.fire({
      icon: 'question',
      title: t('storage.backup.restoreConfirm'),
      html: `<p>${escapeHtml(tPage('backup.fileLabel'))}: <strong>${escapeHtml(file.name)}</strong></p><p class="text-sm mt-2">${escapeHtml(t('storage.backup.restoreConfirmDesc'))}</p>`,
      showCancelButton: true,
      confirmButtonText: t('storage.backup.restore'),
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });

    if (!result.isConfirmed) {
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = '';
      }
      return;
    }

    setIsImporting(true);
    try {
      const imported = await importFullBackupFromZip(file, { mergeHistory: true });
      await refreshHistoryCount();
      setUserCookies(getAllCookieStatus());

      const parts = [
        `<p><strong>${escapeHtml(String(imported.historyImported))}</strong> ${escapeHtml(tPage('backup.historyItemsLabel'))}</p>`,
        `<p><strong>${escapeHtml(String(imported.settingsImported))}</strong> ${escapeHtml(tPage('backup.settingsLabel'))}</p>`,
      ];

      if (imported.cookiesImported > 0) {
        parts.push(`<p><strong>${escapeHtml(String(imported.cookiesImported))}</strong> ${escapeHtml(tPage('backup.cookiesRestoredLabel'))}</p>`);
      }

      if (imported.historySkipped > 0) {
        parts.push(`<p class="text-sm text-gray-400">${escapeHtml(String(imported.historySkipped))} ${escapeHtml(tPage('backup.duplicatesSkippedLabel'))}</p>`);
      }

      void lazySwal.fire({
        icon: 'success',
        title: t('storage.backup.restored'),
        html: parts.join(''),
        timer: 3000,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
      setTimeout(() => window.location.reload(), 3000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tPage('backup.invalidBackupFile'));
    } finally {
      setIsImporting(false);
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = '';
      }
    }
  }, [refreshHistoryCount, t, tPage]);

  const clearAllData = useCallback(async () => {
    const result = await lazySwal.fire({
      icon: 'warning',
      title: t('storage.clear.all'),
      html: t('storage.clear.allDesc'),
      showCancelButton: true,
      confirmButtonText: t('storage.clear.resetAllBtn'),
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    setIsClearing('all');
    await clearAllClientData();
    toast.success(tPage('alerts.allDataCleared'));
    window.location.reload();
  }, [t, tPage]);

  return {
    activeTab,
    setActiveTab,
    backupFileInputRef,
    canInstall,
    currentAccentColor,
    currentLanguage,
    currentTheme,
    discordConfigured,
    editPlatform,
    editValue,
    historyCount,
    isClearing,
    isExporting,
    isImporting,
    isInstalled,
    resolvedAutoTheme,
    tabTitles,
    userCookies,
    clearAllCookiesHandler,
    clearAllData,
    clearIndexedDB,
    clearLocalStorage,
    clearSeasonalData,
    handleClearScraperCache,
    handleAccentColorChange,
    handleClearCookie,
    handleExportBackup,
    handleImportBackup,
    handleInstallApp,
    handleLanguageChange,
    handleResetExperimentalValues,
    handleSaveCookie,
    handleThemeChange,
    refreshHistoryCount,
    setEditPlatform,
    setEditValue,
  };
}
