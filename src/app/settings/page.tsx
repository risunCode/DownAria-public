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
  savePlatformCookie,
  saveTheme,
  saveUnifiedSettings,
  setLanguagePreference,
  setSkipCache,
  type CacheStats,
  type CookiePlatform,
  type DownAriaSettings,
  type LanguagePreference,
  type ThemeType,
} from '@/lib/storage';
import { SeasonalSettings } from '@/components/settings/SeasonalSettings';
import { BasicTab, CookiesTab, IntegrationsTab, StorageTab } from './tabs';

type TabId = 'basic' | 'cookies' | 'storage' | 'integrations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TABS = [
  { id: 'basic' as TabId, label: 'Basic', icon: Settings, title: 'General Settings' },
  { id: 'cookies' as TabId, label: 'Cookies', icon: Cookie, title: 'Cookie Management' },
  { id: 'storage' as TabId, label: 'Storage', icon: Database, title: 'Storage & Data' },
  { id: 'integrations' as TabId, label: 'Integrations', icon: Zap, title: 'Integrations' },
];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const refreshLocale = useLocaleRefresh();

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('dark');
  const [resolvedAutoTheme, setResolvedAutoTheme] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState<LanguagePreference>('auto');

  const [userCookies, setUserCookies] = useState<Record<CookiePlatform, boolean>>({
    facebook: false,
    instagram: false,
    twitter: false,
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

  useEffect(() => {
    setCurrentTheme(getTheme());
    setResolvedAutoTheme(getTimeBasedTheme());
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
        title: 'Installed!',
        text: 'App added to home screen',
        timer: 2000,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // Cookie parsing utilities
  interface ParsedCookie {
    name: string;
    value: string;
  }

  const detectCookieFormat = (text: string): 'json' | 'netscape' | 'flat' => {
    const trimmed = text.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        return 'flat';
      }
    }

    if (trimmed.includes('\t') && /^[^#\s]/.test(trimmed)) {
      return 'netscape';
    }

    return 'flat';
  };

  const parseJsonCookies = (text: string): ParsedCookie[] => {
    const parsed = JSON.parse(text);
    const cookies: ParsedCookie[] = [];

    if (Array.isArray(parsed)) {
      for (const cookie of parsed) {
        if (cookie.name && cookie.value) {
          cookies.push({ name: cookie.name, value: cookie.value });
        }
      }
    } else if (typeof parsed === 'object') {
      if (parsed.name && parsed.value) {
        cookies.push({ name: parsed.name, value: parsed.value });
      } else {
        for (const [name, value] of Object.entries(parsed)) {
          cookies.push({ name, value: String(value) });
        }
      }
    }

    return cookies;
  };

  const parseNetscapeCookies = (text: string): ParsedCookie[] => {
    const cookies: ParsedCookie[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const parts = trimmed.split('\t');
      if (parts.length >= 7) {
        const name = parts[5];
        const value = parts[6];
        if (name && value) {
          cookies.push({ name, value });
        }
      }
    }

    return cookies;
  };

  const convertToFlatFormat = (cookies: ParsedCookie[]): string => {
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
  };

  const handleSaveCookie = useCallback((platform: CookiePlatform) => {
    if (!editValue.trim()) return;

    const trimmed = editValue.trim();
    let flatCookie = '';

    try {
      const format = detectCookieFormat(trimmed);

      if (format === 'json') {
        const cookies = parseJsonCookies(trimmed);
        if (cookies.length === 0) throw new Error('No valid cookies found');
        flatCookie = convertToFlatFormat(cookies);
      } else if (format === 'netscape') {
        const cookies = parseNetscapeCookies(trimmed);
        if (cookies.length === 0) throw new Error('No valid cookies found');
        flatCookie = convertToFlatFormat(cookies);
      } else {
        // Already flat format
        if (!trimmed.includes('=')) throw new Error('Invalid cookie format');
        flatCookie = trimmed;
      }

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
        text: error instanceof Error ? error.message : 'Unknown error',
        timer: 2000,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    }
  }, [editValue, t]);

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
      confirmButtonText: 'Clear',
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
  }, [t]);

  const clearLocalStorage = useCallback(async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: t('storage.clear.localStorage'),
      text: t('storage.clear.localStorageDesc'),
      showCancelButton: true,
      confirmButtonText: 'Clear',
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    if (!result.isConfirmed) return;

    setIsClearing('localstorage');
    localStorage.clear();
    await Swal.fire({
      icon: 'success',
      title: 'Cleared',
      timer: 1000,
      showConfirmButton: false,
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    window.location.reload();
  }, [t]);

  const clearHistoryAndCache = useCallback(async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: t('storage.clear.historyCache'),
      text: t('storage.clear.historyCacheDesc'),
      showCancelButton: true,
      confirmButtonText: 'Clear',
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
        title: 'Cleared',
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsClearing(null);
    }
  }, [t]);

  const clearScraperCache = useCallback(async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Clear Scraper Cache?',
      text: 'This will remove cached scraper results. Next requests will fetch fresh data.',
      showCancelButton: true,
      confirmButtonText: 'Clear',
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
        title: 'Scraper Cache Cleared',
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsClearing(null);
    }
  }, []);

  const clearIndexedDB = useCallback(async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Clear IndexedDB?',
      html: '<p>This will delete <strong>all</strong> IndexedDB data including history and cache.</p><p class="text-sm mt-2 text-red-400">This action cannot be undone!</p>',
      showCancelButton: true,
      confirmButtonText: 'Delete All',
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
        title: 'IndexedDB Cleared',
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsClearing(null);
    }
  }, []);

  const clearSeasonalData = useCallback(async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Clear Seasonal Effects?',
      text: 'This will remove custom background and reset seasonal settings.',
      showCancelButton: true,
      confirmButtonText: 'Clear',
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
        title: 'Seasonal Effects Cleared',
        timer: 1400,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsClearing(null);
    }
  }, []);

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
        title: 'Invalid File',
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
      html: `<p>File: <strong>${file.name}</strong></p><p class="text-sm mt-2">${t('storage.backup.restoreConfirmDesc')}</p>`,
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
        `<p><strong>${imported.historyImported}</strong> history items</p>`,
        `<p><strong>${imported.settingsImported}</strong> settings</p>`,
      ];
      if (imported.cookiesImported > 0) {
        parts.push(`<p><strong>${imported.cookiesImported}</strong> cookies restored</p>`);
      }
      if (imported.historySkipped > 0) {
        parts.push(`<p class="text-sm text-gray-400">${imported.historySkipped} duplicates skipped</p>`);
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
        text: error instanceof Error ? error.message : 'Invalid backup file',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } finally {
      setIsImporting(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  }, [t]);

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
      title: 'All Data Cleared',
      timer: 1000,
      showConfirmButton: false,
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
    });
    window.location.reload();
  }, [t]);

  return (
    <SidebarLayout>
      <div className="py-4 px-3 sm:py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium mb-4">
              <Settings className="w-3.5 h-3.5" />
              Preferences
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
                <span className="gradient-text">{TABS.find(tab => tab.id === activeTab)?.title ?? t('title')}</span>
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
                resolvedAutoTheme={resolvedAutoTheme}
                currentLanguage={currentLanguage}
                canInstall={canInstall}
                isInstalled={isInstalled}
                discordConfigured={discordConfigured}
                onThemeChange={handleThemeChange}
                onLanguageChange={handleLanguageChange}
                onInstallApp={handleInstallApp}
                onNavigateToIntegrations={() => setActiveTab('integrations')}
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
