'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  ExternalLink,
  Search,
  Clock,
  Copy,
  XCircle,
  Check,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { PLATFORMS, HistoryItem } from '@/modules/media';
import { formatRelativeTime } from '@/shared/utils/format';
import {
  getHistory,
  getHistoryCount,
  getHistoryTypeCounts,
  deleteHistory,
  clearHistory,
  initStorage,
  type HistoryEntry,
  type HistoryTypeCounts,
} from '@/modules/history/services';
import { PlatformIcon, VideoIcon, ImageIcon, MusicIcon } from '@/shared/ui/Icons';
import { lazySwal } from '@/shared/utils/lazy-swal';
import { createLogger } from '@/shared/runtime';
import { resolveBackendProxyUrl } from '@/shared/utils/proxy-url';
import { useTranslations } from 'next-intl';

const historyLogger = createLogger('HistoryList');

function idbToHistoryItem(entry: HistoryEntry, unknownQuality: string): HistoryItem {
  return {
    id: entry.id,
    platform: entry.platform,
    title: entry.title,
    thumbnail: entry.thumbnail,
    url: entry.resolvedUrl,
    downloadedAt: new Date(entry.downloadedAt).toISOString(),
    quality: entry.quality || unknownQuality,
    type: entry.type || 'video',
  };
}

function sanitizeExternalHttpUrl(value: string): string | null {
  return resolveBackendProxyUrl(value);
}

function toDisplayPlatformLabel(platformId: string, unknownLabel: string, platformName?: string): string {
  if (platformId === 'twitter') return 'Twitter';
  if (platformName) return platformName;
  if (!platformId) return unknownLabel;
  return platformId.charAt(0).toUpperCase() + platformId.slice(1);
}

interface HistoryListProps {
  refreshTrigger?: number;
  compact?: boolean;
  maxItems?: number;
  onTotalCountChange?: (count: number) => void;
  compactHeaderRight?: React.ReactNode;
}

type MediaFilter = 'all' | 'video' | 'image' | 'audio';
type PageSize = 10 | 20 | 50;

const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 50];
const DEFAULT_PAGE_SIZE: PageSize = 10;
export function HistoryList({
  refreshTrigger,
  compact = false,
  maxItems = 2,
  onTotalCountChange,
  compactHeaderRight,
}: HistoryListProps) {
  const t = useTranslations('historyList');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [typeCountsState, setTypeCountsState] = useState<HistoryTypeCounts>({ all: 0, video: 0, image: 0, audio: 0 });

  const pageFromQuery = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const limitFromQuery = Number.parseInt(searchParams.get('limit') ?? `${DEFAULT_PAGE_SIZE}`, 10);

  const currentPage = !compact && Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1;
  const currentLimit = !compact && PAGE_SIZE_OPTIONS.includes(limitFromQuery as PageSize)
    ? (limitFromQuery as PageSize)
    : DEFAULT_PAGE_SIZE;
  const shouldUsePagedFetch = !compact && searchQuery.trim() === '' && mediaFilter === 'all';

  const updatePaginationParams = useCallback(
    (page: number, limit: PageSize, replace = false) => {
      if (compact) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(Math.max(1, page)));
      params.set('limit', String(limit));

      const query = params.toString();
      const nextUrl = query ? `${pathname}?${query}` : pathname;

      if (replace) {
        router.replace(nextUrl, { scroll: false });
        return;
      }

      router.push(nextUrl, { scroll: false });
    },
    [compact, pathname, router, searchParams]
  );

  const loadHistory = useCallback(async () => {
    try {
      await initStorage();

      if (compact) {
        const [entries, total, counts] = await Promise.all([
          getHistory(maxItems + 1, 0),
          getHistoryCount(),
          getHistoryTypeCounts(),
        ]);
        setHistory(entries.map(entry => idbToHistoryItem(entry, t('unknownQuality'))));
        setTotalCount(total);
        onTotalCountChange?.(total);
        setTypeCountsState(counts);
        return;
      }

      if (shouldUsePagedFetch) {
        const offset = (currentPage - 1) * currentLimit;
        const [entries, total, counts] = await Promise.all([
          getHistory(currentLimit, offset),
          getHistoryCount(),
          getHistoryTypeCounts(),
        ]);
        setHistory(entries.map(entry => idbToHistoryItem(entry, t('unknownQuality'))));
        setTotalCount(total);
        onTotalCountChange?.(total);
        setTypeCountsState(counts);
        return;
      }

      const [entries, total] = await Promise.all([
        getHistory(1000, 0),
        getHistoryCount(),
      ]);
      setHistory(entries.map(entry => idbToHistoryItem(entry, t('unknownQuality'))));
      setTotalCount(total);
      onTotalCountChange?.(total);
      setTypeCountsState({
        all: entries.length,
        video: entries.filter((h) => (h.type || 'video') === 'video').length,
        image: entries.filter((h) => h.type === 'image').length,
        audio: entries.filter((h) => h.type === 'audio').length,
      });
    } catch (err) {
      historyLogger.error('Failed to load history', err, { devOnly: true });
      setHistory([]);
      setTotalCount(0);
      onTotalCountChange?.(0);
      setTypeCountsState({ all: 0, video: 0, image: 0, audio: 0 });
    } finally {
      setIsLoaded(true);
    }
  }, [compact, maxItems, shouldUsePagedFetch, currentPage, currentLimit, onTotalCountChange, t]);

  useEffect(() => {
    loadHistory();
  }, [refreshTrigger, loadHistory]);

  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
      || item.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = mediaFilter === 'all' || item.type === mediaFilter;
    return matchesSearch && matchesType;
  });

  const typeCounts = shouldUsePagedFetch
    ? typeCountsState
    : {
        all: history.length,
        video: history.filter((h) => h.type === 'video').length,
        image: history.filter((h) => h.type === 'image').length,
        audio: history.filter((h) => h.type === 'audio').length,
      };

  const totalFiltered = shouldUsePagedFetch ? totalCount : filteredHistory.length;
  const totalPages = compact ? 1 : Math.max(1, Math.ceil(totalFiltered / currentLimit));
  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const paginationOffset = (currentPage - 1) * currentLimit;

  useEffect(() => {
    if (compact) return;

    const hasValidPage = Number.isFinite(pageFromQuery) && pageFromQuery > 0;
    const hasValidLimit = PAGE_SIZE_OPTIONS.includes(limitFromQuery as PageSize);

    if (!hasValidPage || !hasValidLimit) {
      updatePaginationParams(currentPage, currentLimit, true);
    }
  }, [compact, currentLimit, currentPage, limitFromQuery, pageFromQuery, updatePaginationParams]);

  useEffect(() => {
    if (compact) return;
    if (currentPage > totalPages) {
      updatePaginationParams(totalPages, currentLimit, true);
    }
  }, [compact, currentLimit, currentPage, totalPages, updatePaginationParams]);

  const handleDelete = async (id: string, title: string) => {
    const result = await lazySwal.fire({
      title: t('alerts.deleteItemTitle'),
      text: title.length > 50 ? `${title.substring(0, 50)}...` : title,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: tCommon('delete'),
      cancelButtonText: tCommon('cancel'),
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      confirmButtonColor: 'var(--error)',
      cancelButtonColor: 'var(--accent-primary)',
    });

    if (result.isConfirmed) {
      await deleteHistory(id);
      await loadHistory();
    }
  };

  const handleClearAll = async () => {
    const result = await lazySwal.fire({
      title: t('alerts.clearAllTitle'),
      text: t('alerts.clearAllText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: tCommon('clearAll'),
      cancelButtonText: tCommon('cancel'),
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      confirmButtonColor: 'var(--error)',
      cancelButtonColor: 'var(--accent-primary)',
    });

    if (result.isConfirmed) {
      await clearHistory();
      setHistory([]);
      setTotalCount(0);
    }
  };

  const getTypeIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'video': return <VideoIcon className="w-3.5 h-3.5" />;
      case 'audio': return <MusicIcon className="w-3.5 h-3.5" />;
      case 'image': return <ImageIcon className="w-3.5 h-3.5" />;
      default: return <VideoIcon className="w-3.5 h-3.5" />;
    }
  };

  const handleCopyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  if (!isLoaded) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-[var(--bg-secondary)] rounded w-48 mb-4" />
        <div className="h-20 bg-[var(--bg-secondary)] rounded-xl" />
      </div>
    );
  }

  if (!compact && history.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 text-center">
        <Clock className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t('emptyTitle')}</h3>
        <p className="text-[var(--text-secondary)]">{t('emptyDescription')}</p>
      </div>
    );
  }

  const displayedHistory = compact
    ? filteredHistory.slice(0, maxItems)
    : shouldUsePagedFetch
      ? filteredHistory
      : filteredHistory.slice(paginationOffset, paginationOffset + currentLimit);
  const animateListItems = displayedHistory.length <= 20;

  return (
    <div className="space-y-4">
      <div className="flex flex-row justify-between items-center gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
          {t('title')}
          {!compact && <span className="text-sm font-normal text-[var(--text-muted)]">({totalFiltered})</span>}
        </h2>

        <div className="flex gap-2 flex-shrink-0">
           {compact && compactHeaderRight}
                    {!compact && (
            <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!compact && currentPage !== 1) updatePaginationParams(1, currentLimit, true);
                }}
               className="w-48 pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
               />
                      </div>
                        <Button variant="danger" size="sm" onClick={handleClearAll}>
                <Trash2 className="w-4 h-4" />
                          {tCommon('clear')}
                      </Button>
                    </>
                      )}
        </div>
      </div>

      {!compact && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          {(['all', 'video', 'image', 'audio'] as MediaFilter[]).map((type) => {
            const count = typeCounts[type];
            if (type !== 'all' && count === 0) return null;
            const icons = {
              all: null,
              video: <VideoIcon className="w-3.5 h-3.5" />,
              image: <ImageIcon className="w-3.5 h-3.5" />,
              audio: <MusicIcon className="w-3.5 h-3.5" />,
            };
            const labels = {
              all: t('filters.all'),
              video: t('filters.video'),
              image: t('filters.image'),
              audio: t('filters.audio'),
            };

            return (
              <button
                key={type}
                onClick={() => {
                  setMediaFilter(type);
                  if (!compact && currentPage !== 1) updatePaginationParams(1, currentLimit, true);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  mediaFilter === type
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                {icons[type]}
                {labels[type]}
                <span className={`px-1 rounded text-[10px] ${mediaFilter === type ? 'bg-white/20' : 'bg-[var(--bg-card)]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {displayedHistory.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 text-center">
            <Clock className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t('emptyTitle')}</h3>
            <p className="text-[var(--text-secondary)]">{t('emptyDescription')}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayedHistory.map((item, index) => {
              const platformConfig = PLATFORMS.find((p) => p.id === item.platform);
              const platformLabel = toDisplayPlatformLabel(item.platform, t('unknownPlatform'), platformConfig?.name);
              const safeExternalUrl = sanitizeExternalHttpUrl(item.url);
              const itemClassName = 'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2 group hover:border-[var(--accent-primary)]/30 transition-colors';
              const content = (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start min-w-0">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="relative w-12 h-9 sm:w-16 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
                      {item.thumbnail ? (
                        <Image
                          src={resolveBackendProxyUrl(item.thumbnail) || item.thumbnail}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                          {getTypeIcon(item.type)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-1 tracking-tight">{item.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] font-mono text-[var(--text-muted)] min-w-0">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-transparent max-w-full min-w-0 overflow-hidden"
                          style={{ backgroundColor: `${platformConfig?.color}10`, color: platformConfig?.color, borderColor: `${platformConfig?.color}20` }}
                        >
                          <PlatformIcon platform={item.platform} className="w-3 h-3" />
                          <span className="truncate max-w-[7rem] sm:max-w-[12rem]">{platformLabel}</span>
                        </span>
                        <span className="flex items-center gap-1 min-w-0 max-w-full opacity-80">
                          {getTypeIcon(item.type)} <span className="truncate">{item.quality}</span>
                        </span>
                        <span className="inline-flex sm:inline min-w-0 opacity-60">
                          <Clock className="w-2.5 h-2.5 mr-1" />
                          {formatRelativeTime(item.downloadedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 opacity-75 sm:opacity-60 group-hover:opacity-100 transition-opacity self-stretch sm:self-center sm:ml-2 shrink-0">
                    <button
                      onClick={() => handleCopyUrl(item.id, item.url)}
                      className="p-1.5 sm:p-1 rounded-lg bg-[var(--accent-primary)]/8 border border-[var(--accent-primary)]/20 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/15 transition-colors"
                      title={t('actions.copyUrl')}
                    >
                      {copiedId === item.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {safeExternalUrl ? (
                      <a
                        href={safeExternalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 sm:p-1 rounded-lg bg-[var(--accent-primary)]/8 border border-[var(--accent-primary)]/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/15 transition-colors"
                        title={t('actions.open')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="p-1.5 sm:p-1 rounded-lg bg-[var(--accent-primary)]/8 border border-[var(--accent-primary)]/20 text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                        title={t('actions.invalidUrl')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-1.5 sm:p-1 rounded-lg bg-red-500/8 border border-red-500/20 text-[var(--text-secondary)] hover:bg-red-500/15 hover:text-red-400 transition-colors"
                      title={tCommon('delete')}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
              return (
                animateListItems ? (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className={itemClassName}
                  >
                    {content}
                  </motion.div>
                ) : (
                  <div key={item.id} className={itemClassName}>
                    {content}
                  </div>
                )
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] min-w-0">
            <label htmlFor="history-page-size" className="text-[var(--text-muted)]">{t('perPage')}</label>
            <select
              id="history-page-size"
              value={currentLimit}
              onChange={(e) => {
                const nextLimit = Number.parseInt(e.target.value, 10) as PageSize;
                if (!PAGE_SIZE_OPTIONS.includes(nextLimit)) return;
                updatePaginationParams(1, nextLimit);
              }}
              className="px-2.5 py-1.5 rounded-lg text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap min-w-0">
            <span className="text-xs sm:text-sm text-[var(--text-secondary)] min-w-0 truncate">{t('pageOf', { page: normalizedCurrentPage, total: totalPages })}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updatePaginationParams(currentPage - 1, currentLimit)}
                disabled={currentPage <= 1}
                className="px-2 sm:px-3"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t('prev')}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updatePaginationParams(currentPage + 1, currentLimit)}
                disabled={currentPage >= totalPages}
                className="px-2 sm:px-3"
              >
                <span className="hidden sm:inline">{t('next')}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
