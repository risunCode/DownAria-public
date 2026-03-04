'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie, Database, Settings, Zap } from 'lucide-react';
import Swal from 'sweetalert2';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { useTranslations } from 'next-intl';
import { useLocaleRefresh } from '@/components/core/IntlProvider';
import { getUserDiscordSettings } from '@/lib/utils/discord-webhook';
import {
  clearAllClientCache,
  clearAllCookies,
  clearHistory,
  clearPlatformCookie,
  deleteBackgroundBlob,
  downloadFullBackupAsZip,
  getAccentColor,
  getAllCookieStatus,
  getCacheStats,
  getHistoryCount,
  getLanguagePreference,
  getSkipCache,
  getTheme,
  getTimeBasedTheme,
  getUnifiedSettings,
  importFullBackupFromZip,
  resetSeasonalSettings,
  saveAccentColor,
  savePlatformCookie,
  saveTheme,
  saveUnifiedSettings,
  setLanguagePreference,
  setSkipCache,
  type AccentColorType,
  type CacheStats,
  type CookiePlatform,
  type DownAriaSettings,
  type LanguagePreference,
  type ThemeType,
} from '@/lib/storage';
import { SeasonalSettings } from '@/components/settings/SeasonalSettings';
import { BasicTab, CookiesTab, IntegrationsTab, StorageTab } from './tabs';
import { parseCookieInputToFlat } from '@/lib/utils/cookie-parser';

type TabId = 'basic' | 'cookies' | 'storage' | 'integrations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TABS = [
  { id: 'basic' as TabId, icon: Settings },
  { id: 'cookies' as TabId, icon: Cookie },
  { id: 'storage' as TabId, icon: Database },
  { id: 'integrations' as TabId, icon: Zap },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function SettingsPage() {
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
    weibo: false,
  });
  const [editPlatform, setEditPlatform] = useState<CookiePlatform | null>(null);
  const [editValue, setEditValue] = useState('');

  const [skipCache, setSkipCacheState] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
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

  useEffect(() => {
    setCurrentTheme(getTheme());
    setResolvedAutoTheme(getTimeBasedTheme());
    setCurrentAccentColor(getAccentColor());
    setCurrentLanguage(getLanguagePreference());
    setUserCookies(getAllCookieStatus());
    setSkipCacheState(getSkipCache());

    getHistoryCount().then(setHistoryCount).catch(() => setHistoryCount(0));
    getCacheStats().then(setCacheStats).catch(() => setCacheStats(null));

    const discordSettings = getUserDiscordSettings();
    setDiscordConfigured(Boolean(discordSettings?.webhookUrl));

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    if (standalone) setCanInstall(false);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

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

  const handleLanguageChange = useCallback(
    (lang: LanguagePreference) => {
      setLanguagePreference(lang);
      setCurrentLanguage(lang);
      refreshLocale();
    },
    [refreshLocale]
  );

  const handleInstallApp = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
      setIsInstalled(true);
      Swal.fire({
        icon: 'success',
        title: tPage('alerts.installSuccess.title'),
        text: tPage('alerts.installSuccess.text'),
        timer: 2000,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    }
    setDeferredPrompt(null);
  }, [deferredPrompt, tPage]);

  const handleSaveCookie = useCallback((platform: CookiePlatform) => {
    if (!editValue.trim()) return;

    const trimmed = editValue.trim();
    let flatCookie = '';

    try {
      flatCookie = parseCookieInputToFlat(trimmed, platform);

      savePlatformCookie(platform, flatCookie);
      setUserCookies(getAllCookieStatus());
      setEditPlatform(null);
      setEditValue('');

      Swal.fire({
        icon: 'success',
        title: t('cookies.saved'),
        timer: 1200,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: t('cookies.invalidFormat'),
        text: error instanceof Error
          ? (error.message === 'No valid cookies found'
            ? tPage('alerts.cookies.noValidCookies')
            : error.message === 'Invalid cookie format'
              ? tPage('alerts.cookies.invalidCookieFormat')
              : error.message)
          : tPage('alerts.unknownError'),
        timer: 2000,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    }
  }, [editValue, t, tPage]);

  const handleClearCookie = useCallback((platform: CookiePlatform) => {
    clearPlatformCookie(platform);
    setUserCookies(getAllCookieStatus());
  }, []);

  const clearAllCookiesHandler = useCallback(async () => {
    const result = await Swal.fire({
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

    Swal.fire({
      icon: 'success',
      title: t('cookies.cleared'),
      timer: 1400,
      showConfirmButton: false,
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
  }, [t, tCommon]);

  const clearLocalStorage = useCallback(async () => {
    const result = await Swal.fire({
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
    await Swal.fire({
      icon: 'success',
      title: tPage('alerts.cleared'),
      timer: 1000,
      showConfirmButton: false,
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    window.location.reload();
  }, [t, tCommon, tPage]);

  const clearHistoryAndCache = useCallback(async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: t('storage.clear.historyCache'),
      text: t('storage.clear.historyCacheDesc'),
      showCancelButton: true,
      confirmButtonText: tCommon('clear'),
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    setIsClearing('history_cache');
    try {
      await clearHistory();
      await clearAllClientCache();
      setHistoryCount(0);
      setCacheStats(await getCacheStats());
      await Swal.fire({
        icon: 'success',
        title: tPage('alerts.cleared'),
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsClearing(null);
    }
  }, [t, tCommon, tPage]);

  const clearScraperCache = useCallback(async () => {
    const result = await Swal.fire({
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

    setIsClearing('scraper_cache');
    try {
      await clearAllClientCache();
      setCacheStats(await getCacheStats());
      await Swal.fire({
        icon: 'success',
        title: tPage('alerts.scraperCacheClear.success'),
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsClearing(null);
    }
  }, [tCommon, tPage]);

  const clearIndexedDB = useCallback(async () => {
    const result = await Swal.fire({
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
      if ('indexedDB' in window) {
        const databases = await window.indexedDB.databases();
        await Promise.all(
          databases.map(
            db =>
              new Promise<void>(resolve => {
                if (!db.name) {
                  resolve();
                  return;
                }
                const request = window.indexedDB.deleteDatabase(db.name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
                setTimeout(resolve, 2000);
              })
          )
        );
      }
      setHistoryCount(0);
      await Swal.fire({
        icon: 'success',
        title: tPage('alerts.indexedDbClear.success'),
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsClearing(null);
    }
  }, [tPage]);

  const clearSeasonalData = useCallback(async () => {
    const result = await Swal.fire({
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
      await Swal.fire({
        icon: 'success',
        title: tPage('alerts.seasonalClear.success'),
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsClearing(null);
    }
  }, [tCommon, tPage]);

  const handleResetExperimentalValues = useCallback(async () => {
    const result = await Swal.fire({
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

      // Refresh UI listeners in same tab
      window.dispatchEvent(new CustomEvent('seasonal-settings-changed'));
      window.dispatchEvent(new CustomEvent('settings-changed'));

      await Swal.fire({
        icon: 'success',
        title: tPage('alerts.experimentalReset.success'),
        timer: 1200,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } catch {
      await Swal.fire({
        icon: 'error',
        title: tPage('alerts.experimentalReset.failed'),
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    }
  }, [tPage]);

  const handleExportBackup = useCallback(async () => {
    setIsExporting(true);
    try {
      await downloadFullBackupAsZip();
      Swal.fire({
        icon: 'success',
        title: t('storage.backup.exportSuccess'),
        text: t('storage.backup.exportSuccessDesc'),
        timer: 2000,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } catch {
      Swal.fire({
        icon: 'error',
        title: t('storage.backup.exportFailed'),
        timer: 1500,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsExporting(false);
    }
  }, [t]);

  const handleImportBackup = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      Swal.fire({
        icon: 'error',
        title: tPage('backup.invalidFileTitle'),
        text: t('storage.backup.invalidFile'),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: t('storage.backup.restoreConfirm'),
      html: `<p>${escapeHtml(tPage('backup.fileLabel'))}: <strong>${escapeHtml(file.name)}</strong></p><p class="text-sm mt-2">${escapeHtml(t('storage.backup.restoreConfirmDesc'))}</p>`,
      showCancelButton: true,
      confirmButtonText: t('storage.backup.restore'),
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });

    if (!result.isConfirmed) {
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const imported = await importFullBackupFromZip(file, { mergeHistory: true });
      const newCount = await getHistoryCount();
      setHistoryCount(newCount);
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

      Swal.fire({
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
      Swal.fire({
        icon: 'error',
        title: t('storage.backup.restoreFailed'),
        text: error instanceof Error ? error.message : tPage('backup.invalidBackupFile'),
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsImporting(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  }, [t, tPage]);

  const clearAllData = useCallback(async () => {
    const result = await Swal.fire({
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

    localStorage.clear();
    sessionStorage.clear();

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch {
        // ignore
      }
    }

    if ('indexedDB' in window) {
      try {
        const databases = await window.indexedDB.databases();
        await Promise.all(
          databases.map(
            db =>
              new Promise<void>(resolve => {
                if (!db.name) {
                  resolve();
                  return;
                }
                const request = window.indexedDB.deleteDatabase(db.name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
                setTimeout(resolve, 2000);
              })
          )
        );
      } catch {
        // ignore
      }
    }

    await Swal.fire({
      icon: 'success',
      title: tPage('alerts.allDataCleared'),
      timer: 1000,
      showConfirmButton: false,
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    window.location.reload();
  }, [t, tPage]);

  return (
    <SidebarLayout>
      <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium mb-4">
              <Settings className="w-3.5 h-3.5" />
              {tPage('badge')}
            </div>
            <AnimatePresence mode="wait">
              <motion.h1
                key={activeTab}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="text-2xl sm:text-3xl font-bold mb-3"
              >
                <span className="gradient-text">{tabTitles[activeTab] ?? t('title')}</span>
              </motion.h1>
            </AnimatePresence>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto text-sm sm:text-base">{t('subtitle')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 p-1.5 rounded-2xl glass-card border border-[var(--border-color)] glass-nested"
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t(`tabs.${tab.id}`)}</span>
              </button>
            ))}
          </motion.div>

          <div className="relative">
            {activeTab === 'basic' && (
              <BasicTab
                currentTheme={currentTheme}
                currentAccentColor={currentAccentColor}
                resolvedAutoTheme={resolvedAutoTheme}
                currentLanguage={currentLanguage}
                canInstall={canInstall}
                isInstalled={isInstalled}
                discordConfigured={discordConfigured}
                onThemeChange={handleThemeChange}
                onAccentColorChange={handleAccentColorChange}
                onLanguageChange={handleLanguageChange}
                onInstallApp={handleInstallApp}
                onNavigateToIntegrations={() => setActiveTab('integrations')}
                onResetExperimentalValues={handleResetExperimentalValues}
              >
                <SeasonalSettings />
              </BasicTab>
            )}

            {activeTab === 'cookies' && (
              <CookiesTab
                userCookies={userCookies}
                editPlatform={editPlatform}
                editValue={editValue}
                isClearing={isClearing}
                onEditPlatform={setEditPlatform}
                onEditValueChange={setEditValue}
                onSaveCookie={handleSaveCookie}
                onClearCookie={handleClearCookie}
                onClearAllCookies={clearAllCookiesHandler}
              />
            )}

            {activeTab === 'storage' && (
              <StorageTab
                skipCache={skipCache}
                cacheStats={cacheStats}
                historyCount={historyCount}
                isClearing={isClearing}
                isExporting={isExporting}
                isImporting={isImporting}
                backupFileInputRef={backupFileInputRef}
                onToggleSkipCache={() => {
                  const next = !skipCache;
                  setSkipCache(next);
                  setSkipCacheState(next);
                }}
                onRefreshHistory={() => getHistoryCount().then(setHistoryCount)}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onClearCookies={clearAllCookiesHandler}
                onClearLocalStorage={clearLocalStorage}
                onClearIndexedDB={clearIndexedDB}
                onClearScraperCache={clearScraperCache}
                onClearHistoryAndCache={clearHistoryAndCache}
                onClearSeasonalData={clearSeasonalData}
                onClearAllData={clearAllData}
              />
            )}

            {activeTab === 'integrations' && <IntegrationsTab />}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
