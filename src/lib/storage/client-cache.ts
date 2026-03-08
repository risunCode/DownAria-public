/**
 * Client-Side Cache Module
 * ========================
 * Caches scraper results in IndexedDB to reduce API calls.
 * Replaces server-side Redis caching for web frontend.
 * 
 * Benefits:
 * - Instant cache hits (~5ms vs ~100ms Redis)
 * - Zero server cost
 * - Works offline
 * - Per-user storage
 * 
 * TTL Strategy:
 * - YouTube: 2 minutes (URLs expire quickly)
 * - Stories: 10 minutes (ephemeral content)
 * - Other content: 30 minutes (balance freshness)
 */

import type { PlatformId } from '@/lib/types';
import { extractContentId, isStoryLikeContent, makeContentCacheKey } from '@/lib/utils/content-id';
import { openAriaIndexDB, SCRAPER_CACHE_STORE } from './aria-indexed-db';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CachedResult {
  /** Cache key: platform:contentId */
  key: string;
  /** Platform identifier */
  platform: PlatformId;
  /** Content ID extracted from URL */
  contentId: string;
  /** Original URL */
  url: string;
  /** Scraper result data */
  data: unknown;
  /** When cached (timestamp) */
  cachedAt: number;
  /** When expires (timestamp) */
  expiresAt: number;
  /** Access count for stats */
  accessCount: number;
  /** Last access time */
  lastAccess: number;
}

export interface CacheStats {
  /** Total cached items */
  count: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: string;
  /** Estimated storage size */
  size: string;
  /** Items by platform */
  byPlatform: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// TTL CONFIGURATION (in milliseconds)
// ═══════════════════════════════════════════════════════════════

const TTL_CONFIG: Record<PlatformId, number> = {
  youtube: 2 * 60 * 1000,      // 2 minutes - URLs expire quickly
  instagram: 30 * 60 * 1000,   // 30 minutes
  threads: 30 * 60 * 1000,     // 30 minutes
  facebook: 30 * 60 * 1000,    // 30 minutes
  tiktok: 30 * 60 * 1000,      // 30 minutes
  twitter: 30 * 60 * 1000,     // 30 minutes
  bilibili: 30 * 60 * 1000,    // 30 minutes
  reddit: 30 * 60 * 1000,      // 30 minutes
  soundcloud: 30 * 60 * 1000,  // 30 minutes
  pixiv: 30 * 60 * 1000,       // 30 minutes
  erome: 30 * 60 * 1000,       // 30 minutes
  eporner: 30 * 60 * 1000,     // 30 minutes
  pornhub: 30 * 60 * 1000,     // 30 minutes
  rule34video: 30 * 60 * 1000, // 30 minutes
};

/** TTL for stories (shorter) */
const STORY_TTL = 10 * 60 * 1000; // 10 minutes

/** Max cache entries before cleanup */
const MAX_CACHE_ENTRIES = 200;

/** Probability of cleanup after write (10% = 0.1) */
const CLEANUP_PROBABILITY = 0.1;

/** Stats storage key */
const STATS_KEY = 'downaria_cache_stats';

// ═══════════════════════════════════════════════════════════════
// DATABASE SETUP
// ═══════════════════════════════════════════════════════════════

const CACHE_STORE = SCRAPER_CACHE_STORE;

function openDB(): Promise<IDBDatabase> {
  return openAriaIndexDB();
}

/**
 * Check if content is a story (shorter TTL)
 */
function isStoryContent(url: string, contentId: string): boolean {
  return isStoryLikeContent(url, contentId);
}

// ═══════════════════════════════════════════════════════════════
// STATS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

interface InternalStats {
  hits: number;
  misses: number;
}

function getStats(): InternalStats {
  if (typeof window === 'undefined') return { hits: 0, misses: 0 };
  try {
    const stored = localStorage.getItem(STATS_KEY);
    return stored ? JSON.parse(stored) : { hits: 0, misses: 0 };
  } catch {
    return { hits: 0, misses: 0 };
  }
}

function saveStats(stats: InternalStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

function trackHit(): void {
  const stats = getStats();
  stats.hits++;
  saveStats(stats);
}

function trackMiss(): void {
  const stats = getStats();
  stats.misses++;
  saveStats(stats);
}

// ═══════════════════════════════════════════════════════════════
// CORE CACHE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get cached result
 */
export async function cacheGet<T>(platform: PlatformId, url: string): Promise<T | null> {
  try {
    const contentId = extractContentId(platform, url);
    if (!contentId) {
      trackMiss();
      return null;
    }
    
    const database = await openDB();
    const key = makeContentCacheKey(platform, contentId);
    
    return new Promise((resolve) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const entry = request.result as CachedResult | undefined;
        
        if (!entry) {
          trackMiss();
          resolve(null);
          return;
        }
        
        // Check expiry
        if (Date.now() > entry.expiresAt) {
          // Delete expired entry
          store.delete(key);
          trackMiss();
          resolve(null);
          return;
        }
        
        // Update access stats
        entry.accessCount++;
        entry.lastAccess = Date.now();
        store.put(entry);
        
        trackHit();
        resolve(entry.data as T);
      };
      
      request.onerror = () => {
        trackMiss();
        resolve(null);
      };
    });
  } catch {
    trackMiss();
    return null;
  }
}

/**
 * Set cached result
 */
export async function cacheSet<T>(
  platform: PlatformId,
  url: string,
  data: T,
  isStory = false
): Promise<void> {
  try {
    const contentId = extractContentId(platform, url);
    if (!contentId) return;
    
    const database = await openDB();
    const key = makeContentCacheKey(platform, contentId);
    const now = Date.now();
    
    // Determine TTL
    const ttl = isStory || isStoryContent(url, contentId)
      ? STORY_TTL
      : TTL_CONFIG[platform] || 30 * 60 * 1000;
    
    const entry: CachedResult = {
      key,
      platform,
      contentId,
      url,
      data,
      cachedAt: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccess: now,
    };
    
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      const request = store.put(entry);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Probabilistic cleanup (10% chance after each write)
    // This prevents expired entries from accumulating
    if (Math.random() < CLEANUP_PROBABILITY) {
      cleanupIfNeeded().catch(() => {});
    }
  } catch {
    // Silently fail - cache is optional
  }
}

/**
 * Delete specific cache entry
 */
export async function cacheDelete(platform: PlatformId, url: string): Promise<void> {
  try {
    const contentId = extractContentId(platform, url);
    if (!contentId) return;
    
    const database = await openDB();
    const key = makeContentCacheKey(platform, contentId);
    
    return new Promise((resolve) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// CLEANUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const database = await openDB();
    const now = Date.now();
    let cleared = 0;
    
    return new Promise((resolve) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cleared++;
          cursor.continue();
        }
      };
      
      tx.oncomplete = () => resolve(cleared);
      tx.onerror = () => resolve(cleared);
    });
  } catch {
    return 0;
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const database = await openDB();
    
    return new Promise((resolve) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* ignore */ }
}

/**
 * Cleanup old entries if over limit (LRU eviction)
 */
export async function cleanupIfNeeded(): Promise<number> {
  try {
    const database = await openDB();
    
    // First clear expired
    const expiredCleared = await clearExpiredCache();
    
    // Check count
    const count = await new Promise<number>((resolve) => {
      const tx = database.transaction(CACHE_STORE, 'readonly');
      const store = tx.objectStore(CACHE_STORE);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
    
    if (count <= MAX_CACHE_ENTRIES) {
      return expiredCleared;
    }
    
    // Need to evict oldest entries
    const toDelete = count - MAX_CACHE_ENTRIES + 20; // Delete 20 extra for buffer
    let deleted = 0;
    
    return new Promise((resolve) => {
      const tx = database.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      const index = store.index('lastAccess');
      
      const request = index.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && deleted < toDelete) {
          cursor.delete();
          deleted++;
          cursor.continue();
        }
      };
      
      tx.oncomplete = () => resolve(expiredCleared + deleted);
      tx.onerror = () => resolve(expiredCleared);
    });
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  const defaultStats: CacheStats = {
    count: 0,
    hits: 0,
    misses: 0,
    hitRate: '0%',
    size: '0 KB',
    byPlatform: {},
  };
  
  try {
    const database = await openDB();
    const internalStats = getStats();
    
    // Count entries by platform
    const byPlatform: Record<string, number> = {};
    let count = 0;
    
    await new Promise<void>((resolve) => {
      const tx = database.transaction(CACHE_STORE, 'readonly');
      const store = tx.objectStore(CACHE_STORE);
      
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry = cursor.value as CachedResult;
          count++;
          byPlatform[entry.platform] = (byPlatform[entry.platform] || 0) + 1;
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => resolve();
    });
    
    // Calculate hit rate
    const total = internalStats.hits + internalStats.misses;
    const hitRate = total > 0 
      ? `${((internalStats.hits / total) * 100).toFixed(1)}%`
      : '0%';
    
    // Estimate storage size
    let size = '0 KB';
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          const kb = estimate.usage / 1024;
          size = kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
        }
      } catch { /* ignore */ }
    }
    
    return {
      count,
      hits: internalStats.hits,
      misses: internalStats.misses,
      hitRate,
      size,
      byPlatform,
    };
  } catch {
    return defaultStats;
  }
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  saveStats({ hits: 0, misses: 0 });
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/** Track if visibility listener is registered */
let visibilityListenerRegistered = false;

/**
 * Initialize cache (call on app start)
 * - Opens IndexedDB connection
 * - Cleans up expired entries
 * - Sets up visibility-based cleanup (runs when user returns to tab)
 */
export async function initCache(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    await openDB();
    // Cleanup expired entries on init
    await clearExpiredCache();
    
    // Register visibility change listener (only once)
    // This cleans up expired entries when user returns to the tab
    if (!visibilityListenerRegistered) {
      visibilityListenerRegistered = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // User returned to tab - cleanup expired entries
          clearExpiredCache().catch(() => {});
        }
      });
    }
  } catch (err) {
    console.warn('[ClientCache] Init failed:', err);
  }
}
