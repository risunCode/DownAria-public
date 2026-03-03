'use client';

import { motion } from 'framer-motion';
import { Cookie, Database, Download, HardDrive, Loader2, Package, RefreshCw, Sparkles, Trash2, Upload, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { type CacheStats } from '@/lib/storage';

interface StorageTabProps {
  skipCache: boolean;
  cacheStats: CacheStats | null;
  historyCount: number;
  isClearing: string | null;
  isExporting: boolean;
  isImporting: boolean;
  backupFileInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleSkipCache: () => void;
  onRefreshHistory: () => void;
  onExportBackup: () => void;
  onImportBackup: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearCookies: () => void;
  onClearLocalStorage: () => void;
  onClearIndexedDB: () => void;
  onClearScraperCache: () => void;
  onClearHistoryAndCache: () => void;
  onClearSeasonalData: () => void;
  onClearAllData: () => void;
}

export function StorageTab({
  skipCache,
  cacheStats,
  historyCount,
  isClearing,
  isExporting,
  isImporting,
  backupFileInputRef,
  onToggleSkipCache,
  onRefreshHistory,
  onExportBackup,
  onImportBackup,
  onClearCookies,
  onClearLocalStorage,
  onClearIndexedDB,
  onClearScraperCache,
  onClearHistoryAndCache,
  onClearSeasonalData,
  onClearAllData,
}: StorageTabProps) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
      <div className="glass-card p-6 rounded-2xl border border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-[var(--accent-primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data & Storage</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all">
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 ${skipCache ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Skip Cache</p>
                <p className="text-xs text-[var(--text-muted)]">Always fetch fresh results (bypass local cache)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleSkipCache}
              className={`relative w-12 h-6 rounded-full shrink-0 transition-colors ${
                skipCache ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${skipCache ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-[var(--accent-primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Full Backup</p>
                  <p className="text-xs text-[var(--text-muted)]">{historyCount} history + settings</p>
                </div>
              </div>
              <button onClick={onRefreshHistory} className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)]">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <input type="file" ref={backupFileInputRef} accept=".zip" onChange={onImportBackup} className="hidden" />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onExportBackup} disabled={isExporting} className="flex-1">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export
              </Button>
              <Button variant="secondary" size="sm" onClick={() => backupFileInputRef.current?.click()} disabled={isImporting} className="flex-1">
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import
              </Button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2">Backup contains history + settings and merges on import.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StorageCard
              icon={Database}
              iconColor="text-cyan-400"
              title="Download History"
              subtitle="IndexedDB history"
              storageKeys={['indexeddb:ariaindex/history']}
              onClear={onClearIndexedDB}
              isClearing={isClearing === 'indexeddb'}
            />
            <StorageCard
              icon={Zap}
              iconColor="text-emerald-400"
              title="Scraper Cache"
              subtitle={cacheStats ? `${cacheStats.count} items • ${cacheStats.hitRate} hit rate` : 'Local cache'}
              storageKeys={['downaria_cache_stats']}
              onClear={onClearScraperCache}
              isClearing={isClearing === 'scraper_cache'}
            />
            <StorageCard
              icon={HardDrive}
              iconColor="text-purple-400"
              title="LocalStorage"
              subtitle="Themes & app preferences"
              storageKeys={['downaria_settings', 'downaria_experimental_audio', 'downaria_queue', 'downaria_discord_webhook']}
              onClear={onClearLocalStorage}
              isClearing={isClearing === 'localstorage'}
            />
            <StorageCard
              icon={Sparkles}
              iconColor="text-pink-400"
              title="Seasonal Effects"
              subtitle="Background and particles"
              storageKeys={['indexeddb:ariaindex/backgrounds']}
              onClear={onClearSeasonalData}
              isClearing={isClearing === 'seasonal'}
            />
            <StorageCard
              icon={Cookie}
              iconColor="text-amber-400"
              title="Cookies"
              subtitle="Platform auth"
              storageKeys={['downaria_cookies']}
              onClear={onClearCookies}
              isClearing={isClearing === 'cookies'}
            />
            <StorageCard
              icon={Package}
              iconColor="text-blue-400"
              title="Service Worker"
              subtitle="Offline cache + history/cache"
              storageKeys={['cachestorage:*', 'indexeddb:ariaindex/history', 'indexeddb:ariaindex/backgrounds']}
              onClear={onClearHistoryAndCache}
              isClearing={isClearing === 'history_cache'}
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-5 rounded-2xl border border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Reset All Data</p>
              <p className="text-xs text-[var(--text-muted)]">Factory reset and clear everything</p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={onClearAllData} disabled={isClearing === 'all'}>
            {isClearing === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Reset All
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function StorageCard({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  storageKeys,
  onClear,
  isClearing,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  subtitle: string;
  storageKeys: string[];
  onClear: () => void;
  isClearing: boolean;
}) {
  const formatStorageKey = (key: string): string => {
    if (key.startsWith('indexeddb:')) {
      const raw = key.replace('indexeddb:', '');
      const [dbName, storeName] = raw.split('/');
      if (storeName && storeName !== '*') {
        return `IndexedDB: ${dbName} (${storeName})`;
      }
      return `IndexedDB: ${dbName}`;
    }

    if (key.startsWith('cachestorage:')) {
      return `CacheStorage: ${key.replace('cachestorage:', '')}`;
    }

    const aliases: Record<string, string> = {
      downaria_settings: 'App settings',
      downaria_queue: 'Download queue',
      downaria_experimental_audio: 'Experimental audio',
      downaria_discord_webhook: 'Discord webhook (encrypted)',
      downaria_cache_stats: 'Scraper cache stats',
      downaria_cookies: 'Platform cookies (encrypted)',
    } as const;

    const label = aliases[key as keyof typeof aliases] || key;
    return `LocalStorage: ${label}`;
  };

  const friendlyKeys = Array.from(new Set(storageKeys.map(formatStorageKey))).slice(0, 2);

  return (
    <div className="glass-card p-3 rounded-xl border border-[var(--border-color)]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-[var(--bg-card)]">
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-[var(--text-primary)] truncate">{title}</p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="mb-2" title={storageKeys.join(', ')}>
        {friendlyKeys.map((label) => (
          <p key={label} className="text-[10px] text-[var(--text-muted)] font-mono truncate">
            {label}
          </p>
        ))}
      </div>
      <Button variant="secondary" size="xs" onClick={onClear} disabled={isClearing} className="w-full">
        {isClearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Clear
      </Button>
    </div>
  );
}
