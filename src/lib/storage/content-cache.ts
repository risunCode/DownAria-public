import type { PlatformId } from '../types';
import {
  extractContentId,
  isStoryLikeContent,
  makeContentCacheKey,
} from '../utils/content-id';

export interface ContentCacheEntry<T = unknown> {
  key: string;
  platform: PlatformId;
  contentId: string;
  url: string;
  data: T;
  cachedAt: number;
  expiresAt: number;
  lastAccess: number;
}

export interface ContentCacheGetOptions {
  skipCache?: boolean;
  now?: number;
}

export interface ContentCacheSetOptions {
  skipCache?: boolean;
  ttlMs?: number;
  isStory?: boolean;
  now?: number;
}

export interface ContentCacheConfig {
  maxEntries?: number;
  platformTtlMs?: Record<PlatformId, number>;
  storyTtlMs?: number;
}

export const DEFAULT_CONTENT_CACHE_MAX_ENTRIES = 100;
export const DEFAULT_STORY_CACHE_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_PLATFORM_TTL_MS: Record<PlatformId, number> = {
  youtube: 2 * 60 * 1000,
  instagram: 30 * 60 * 1000,
  threads: 30 * 60 * 1000,
  facebook: 30 * 60 * 1000,
  tiktok: 30 * 60 * 1000,
  twitter: 30 * 60 * 1000,
  bilibili: 30 * 60 * 1000,
  reddit: 30 * 60 * 1000,
  soundcloud: 30 * 60 * 1000,
  pixiv: 30 * 60 * 1000,
  erome: 30 * 60 * 1000,
  eporner: 30 * 60 * 1000,
  pornhub: 30 * 60 * 1000,
  rule34video: 30 * 60 * 1000,
};

export class ContentCache {
  private readonly maxEntries: number;
  private readonly platformTtlMs: Record<PlatformId, number>;
  private readonly storyTtlMs: number;
  private readonly cache = new Map<string, ContentCacheEntry>();

  constructor(config: ContentCacheConfig = {}) {
    this.maxEntries = config.maxEntries ?? DEFAULT_CONTENT_CACHE_MAX_ENTRIES;
    this.storyTtlMs = config.storyTtlMs ?? DEFAULT_STORY_CACHE_TTL_MS;
    this.platformTtlMs = {
      ...DEFAULT_PLATFORM_TTL_MS,
      ...(config.platformTtlMs ?? {}),
    };
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  deleteByUrl(platform: PlatformId, url: string): void {
    const contentId = extractContentId(platform, url);
    if (!contentId) return;
    this.cache.delete(makeContentCacheKey(platform, contentId));
  }

  getByUrl<T>(
    platform: PlatformId,
    url: string,
    options: ContentCacheGetOptions = {},
  ): T | null {
    if (options.skipCache) return null;

    const contentId = extractContentId(platform, url);
    if (!contentId) return null;

    return this.getByContentId<T>(platform, contentId, options);
  }

  getByContentId<T>(
    platform: PlatformId,
    contentId: string,
    options: ContentCacheGetOptions = {},
  ): T | null {
    if (options.skipCache) return null;

    const key = makeContentCacheKey(platform, contentId);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = options.now ?? Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccess = now;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  setByUrl<T>(
    platform: PlatformId,
    url: string,
    data: T,
    options: ContentCacheSetOptions = {},
  ): boolean {
    if (options.skipCache) return false;

    const contentId = extractContentId(platform, url);
    if (!contentId) return false;

    return this.setByContentId(platform, contentId, url, data, {
      ...options,
      isStory: options.isStory ?? isStoryLikeContent(url, contentId),
    });
  }

  setByContentId<T>(
    platform: PlatformId,
    contentId: string,
    url: string,
    data: T,
    options: ContentCacheSetOptions = {},
  ): boolean {
    if (options.skipCache) return false;

    const now = options.now ?? Date.now();
    const ttlMs = options.ttlMs ?? (options.isStory ? this.storyTtlMs : this.platformTtlMs[platform]);
    const key = makeContentCacheKey(platform, contentId);

    const entry: ContentCacheEntry<T> = {
      key,
      platform,
      contentId,
      url,
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
      lastAccess: now,
    };

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, entry as ContentCacheEntry);
    this.evictLeastRecentlyUsed();

    return true;
  }

  pruneExpired(now = Date.now()): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  private evictLeastRecentlyUsed(): void {
    while (this.cache.size > this.maxEntries) {
      const lruKey = this.cache.keys().next().value as string | undefined;
      if (!lruKey) break;
      this.cache.delete(lruKey);
    }
  }
}

export function createContentCache(config: ContentCacheConfig = {}): ContentCache {
  return new ContentCache(config);
}
