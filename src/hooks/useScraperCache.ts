/**
 * Scraper cache helpers
 * ====================
 * Wraps scraper API calls with client-side IndexedDB caching.
 * 
 * Flow:
 * 1. Check IndexedDB cache first
 * 2. If cache hit → return cached data (instant)
 * 3. If cache miss → call API → cache result → return
 * 
 * Benefits:
 * - Instant cache hits (~5ms vs ~100ms+ API)
 * - Zero server cost for repeated requests
 * - Works offline for cached content
 * - Reduces Redis usage on backend
 */

import { api, ApiError } from '@/lib/api';
import { validateExtractResponse } from '@/lib/api/schemas';
import {
  initCache,
  cacheGet,
  cacheSet,
  cleanupClientCache,
  extractContentId,
  createContentCache,
} from '@/lib/storage';
import { platformDetect } from '@/lib/utils/format';
import { ErrorCodes } from '@/lib/errors/codes';
import {
  retryWithBackoff,
  isRetryableError as isRetryableRequestError,
  RetryExhaustedError,
} from '@/lib/utils/retry';
import type {
  PlatformId,
  MediaData,
  MediaFormat,
  EngagementStats,
  ExtractResult,
} from '@/lib/types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ScraperResponse {
  success: boolean;
  data?: MediaData;
  responseJson?: unknown;
  error?: string;
  errorCode?: string;
  errorMetadata?: Record<string, unknown>;
  platform?: string;
}

function isRetryableExtractError(error: unknown): boolean {
  // Stop retry loops when backend already returned a failed response.
  // Retries are only useful for transport-level failures.
  if (error instanceof ApiError) {
    return false;
  }
  return isRetryableRequestError(error);
}

const contentIdCache = createContentCache();

function isMediaData(value: unknown): value is MediaData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as MediaData;
  return Array.isArray(candidate.formats);
}

function hasUsableFormats(data: MediaData | null | undefined): data is MediaData {
  return !!data && Array.isArray(data.formats) && data.formats.length > 0;
}

function normalizeEngagementValue(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

function normalizeEngagementStats(stats: Partial<EngagementStats> | undefined): EngagementStats | undefined {
  if (!stats) return undefined;

  const normalized: EngagementStats = {
    views: normalizeEngagementValue(stats.views),
    likes: normalizeEngagementValue(stats.likes),
    comments: normalizeEngagementValue(stats.comments),
    shares: normalizeEngagementValue(stats.shares),
    bookmarks: normalizeEngagementValue(stats.bookmarks),
  };

  const hasAnyValue = Object.values(normalized).some((value) => typeof value === 'number');
  return hasAnyValue ? normalized : undefined;
}

function inferSourceType(itemType: string | undefined, variant: ExtractResult['media'][number]['variants'][number]): MediaFormat['type'] {
  if (itemType === 'audio' || itemType === 'image') return itemType;

  const mime = typeof variant.mime === 'string' ? variant.mime.toLowerCase() : '';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';

  const format = typeof variant.format === 'string' ? variant.format.toLowerCase() : '';
  const formatId = typeof variant.formatId === 'string' ? variant.formatId.toLowerCase() : '';
  if (formatId.includes('audio')) return 'audio';

  const variantUrl = typeof variant.url === 'string' ? variant.url.toLowerCase() : '';
  if (/(?:[_\-/]audio(?:[_\-/]|\.)|audio\.m3u8)/.test(variantUrl)) return 'audio';

  const audioExt = new Set(['m4a', 'mp3', 'aac', 'opus', 'ogg', 'wav', 'flac', 'weba']);
  const imageExt = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);
  if (audioExt.has(format)) return 'audio';
  if (imageExt.has(format)) return 'image';

  if (mime.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm3u8'].includes(format)) {
    return 'video';
  }

  const tokens = [variant.quality, variant.format]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();
  if (/(audio only|audio|m4a|mp3|aac|opus|vorbis)/.test(tokens)) return 'audio';

  const resolution = typeof variant.resolution === 'string' ? variant.resolution.toLowerCase() : '';
  if (resolution.includes('audio only')) return 'audio';

  return 'video';
}

function mapBackendResultToMediaData(result: ExtractResult, requestUrl: string): MediaData {
  const formats: MediaFormat[] = [];

  const normalizedTitle = typeof result.content?.text === 'string' ? result.content.text.trim() : '';
  const normalizedDescription = typeof result.content?.description === 'string' ? result.content.description.trim() : '';

  (result.media || []).forEach((item, itemIndex) => {
    const itemId = `item-${typeof item.index === 'number' ? item.index : itemIndex}`;
    (item.variants || []).forEach((variant) => {
      if (!variant?.url) return;
      const inferredType = inferSourceType(item.type, variant);
      formats.push({
        quality: variant.quality || 'Original',
        type: inferredType,
        url: variant.url,
        filesize: typeof variant.filesize === 'number' ? variant.filesize : undefined,
        mimeType: variant.mime,
        format: variant.format,
        extension: variant.format,
        itemId,
        thumbnail: item.thumbnail,
        needsMerge: variant.requiresMerge,
        codec: variant.codec,
        bitrate: typeof variant.bitrate === 'number' ? variant.bitrate : undefined,
        resolution: variant.resolution,
        hasAudio: variant.hasAudio,
        formatId: variant.formatId,
        filename: typeof variant.filename === 'string' ? variant.filename : undefined,
      });
    });
  });

  const primaryThumbnail = result.media?.find((item) => !!item.thumbnail)?.thumbnail || '';
  const normalizedAuthorName = typeof result.author?.name === 'string' ? result.author.name.trim() : '';
  const normalizedAuthorHandleRaw = typeof result.author?.handle === 'string' ? result.author.handle.trim() : '';
  const normalizedAuthorHandle = normalizedAuthorHandleRaw.replace(/^@+/, '');
  const authorDisplay = normalizedAuthorName || (normalizedAuthorHandle ? `@${normalizedAuthorHandle}` : '') || undefined;

  return {
    title: normalizedTitle || 'Untitled',
    thumbnail: primaryThumbnail,
    author: authorDisplay,
    authorUsername: normalizedAuthorHandle || undefined,
    authorAlias: normalizedAuthorName || undefined,
    formats,
    url: requestUrl,
    usedCookie: result.authentication?.used ?? false,
    platform: result.platform,
    contentType: result.mediaType,
    id: result.content?.id,
    uploadDate: result.content?.createdAt,
    description: normalizedDescription || undefined,
    engagement: normalizeEngagementStats({
      views: result.engagement?.views,
      likes: result.engagement?.likes,
      comments: result.engagement?.comments,
      shares: result.engagement?.shares,
      bookmarks: result.engagement?.bookmarks,
    }),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseResetAt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    if (value > 1_000_000_000_000) return Math.floor(value);
    if (value > 1_000_000_000) return Math.floor(value * 1000);
    return Math.floor(Date.now() + (value * 1000));
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return parseResetAt(numeric);
    }

    const asDate = Date.parse(value);
    if (!Number.isNaN(asDate) && asDate > Date.now()) {
      return asDate;
    }
  }

  return undefined;
}

function parseRetryAfterToResetAt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    if (value > 86_400_000) {
      return Math.floor(value);
    }
    return Math.floor(Date.now() + (value * 1000));
  }

  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const numeric = Number.parseFloat(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return Math.floor(Date.now() + (numeric * 1000));
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp) || timestamp <= Date.now()) {
    return undefined;
  }

  return timestamp;
}

function getRateLimitMetadataFromPayload(payload: unknown, status?: number): Record<string, unknown> | undefined {
  const root = asRecord(payload);
  if (!root) return undefined;

  const errorObj = asRecord(root.error);
  const metadata = asRecord(errorObj?.metadata) ?? asRecord(root.metadata);

  const category = typeof errorObj?.category === 'string' ? errorObj.category : undefined;
  const code = typeof errorObj?.code === 'string' ? errorObj.code : undefined;
  const isRateLimited = status === 429
    || category?.toUpperCase() === 'RATE_LIMIT'
    || code?.toUpperCase().includes('RATE_LIMIT');

  if (!isRateLimited) return undefined;

  const merged: Record<string, unknown> = {
    ...(metadata ?? {}),
  };

  let resetAt = parseResetAt(metadata?.resetAt);
  if (!resetAt) {
    const headers = asRecord(metadata?.headers) ?? asRecord(root.headers);
    const retryAfter = headers?.['Retry-After'] ?? headers?.['retry-after'];
    resetAt = parseRetryAfterToResetAt(retryAfter);
  }

  if (resetAt) {
    merged.resetAt = resetAt;
    merged.retryAfter = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function getApiErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status;
  const root = asRecord(error);
  if (!root) return undefined;
  if (typeof root.status === 'number') return root.status;
  const response = asRecord(root.response);
  return typeof response?.status === 'number' ? response.status : undefined;
}

function getApiErrorCode(error: unknown): string | undefined {
  if (error instanceof RetryExhaustedError) {
    return getApiErrorCode(error.metadata.lastError);
  }

  if (!(error instanceof ApiError)) {
    const root = asRecord(error);
    if (typeof root?.code === 'string' && root.code.trim()) {
      return root.code.trim();
    }
    return undefined;
  }

  if (!error.data || typeof error.data !== 'object') return undefined;

  const payload = error.data as { error?: unknown };
  if (!payload.error || typeof payload.error !== 'object') return undefined;

  const errorObj = payload.error as { code?: unknown };
  return typeof errorObj.code === 'string' && errorObj.code.trim()
    ? errorObj.code.trim()
    : undefined;
}

function getApiErrorMetadata(error: unknown): Record<string, unknown> | undefined {
  if (error instanceof RetryExhaustedError) {
    const rootMetadata = getApiErrorMetadata(error.metadata.lastError) ?? {};
    return {
      ...rootMetadata,
      retriesExhausted: true,
      attempts: error.metadata.attempts,
      maxAttempts: error.metadata.maxAttempts,
      delaysMs: error.metadata.delaysMs,
    };
  }

  const status = getApiErrorStatus(error);
  const payload = error instanceof ApiError ? error.data : asRecord(error)?.data;
  return getRateLimitMetadataFromPayload(payload, status);
}

function getResponseMeta(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const meta = (raw as { meta?: unknown }).meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {};
  }

  return { ...(meta as Record<string, unknown>) };
}

function normalizeScraperResponse(raw: unknown, requestUrl: string, responseTimeMs?: number): ScraperResponse {
  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      error: 'Invalid API response',
      errorCode: ErrorCodes.INVALID_JSON,
    };
  }

  const envelope = raw as {
    success?: boolean;
    data?: unknown;
    error?: unknown;
    meta?: unknown;
  };

  const meta = envelope.meta as { responseTime?: unknown } | undefined;
  const apiResponseTime = typeof meta?.responseTime === 'number' ? meta.responseTime : undefined;
  const finalResponseTime = apiResponseTime ?? responseTimeMs;

  const validated = validateExtractResponse(raw);
  if (!validated.success) {
    if (!envelope.success) {
      const errorObj = envelope.error as { code?: string; message?: string; metadata?: unknown } | undefined;
      const metadata = {
        ...getResponseMeta(raw),
        ...getRateLimitMetadataFromPayload({ error: errorObj }),
      };
      return {
        success: false,
        error: typeof errorObj?.message === 'string' ? errorObj.message : 'Request failed',
        errorCode: typeof errorObj?.code === 'string' ? errorObj.code : validated.error.code,
        errorMetadata: metadata,
      };
    }

    return {
      success: false,
      error: validated.error.message,
      errorCode: validated.error.code,
      errorMetadata: {
        ...getResponseMeta(raw),
        ...getRateLimitMetadataFromPayload(raw),
      },
    };
  }

  const mapped = mapBackendResultToMediaData(validated.data as unknown as ExtractResult, requestUrl);
  return {
    success: true,
    data: {
      ...mapped,
      responseTime: typeof finalResponseTime === 'number' ? finalResponseTime : undefined,
    },
    responseJson: raw,
    platform: validated.data.platform,
  };
}

async function requestScraper(url: string, cookie?: string): Promise<ScraperResponse> {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const raw = await retryWithBackoff(
    async () => api.post<unknown>('/api/web/extract', {
      url,
      cookie,
    }),
    {
      maxAttempts: 3,
      baseDelayMs: 250,
      isRetryable: isRetryableExtractError,
    },
  );

  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return normalizeScraperResponse(raw, url, Math.round(end - start));
}

interface ScraperResult {
  success: boolean;
  data?: MediaData;
  responseJson?: unknown;
  error?: string;
  errorCode?: string;
  errorMetadata?: Record<string, unknown>;
  fromCache?: boolean;
}

async function getCachedMediaByContentId(
  platform: PlatformId,
  url: string,
  skipCache: boolean,
): Promise<MediaData | null> {
  const contentId = extractContentId(platform, url);
  if (!contentId) return null;

  const memoryHit = contentIdCache.getByContentId<MediaData>(platform, contentId, { skipCache });
  if (hasUsableFormats(memoryHit)) {
    return memoryHit;
  }

  const persisted = await cacheGet<MediaData>(platform, url);
  if (!hasUsableFormats(persisted)) {
    return null;
  }

  contentIdCache.setByContentId(platform, contentId, url, persisted, {
    skipCache,
    isStory: url.includes('/stories/'),
  });

  return persisted;
}

function setCachedMediaByContentId(
  platform: PlatformId,
  url: string,
  data: MediaData,
  skipCache: boolean,
): void {
  if (skipCache) return;

  const contentId = extractContentId(platform, url);
  if (!contentId) return;

  const isStory = url.includes('/stories/');
  contentIdCache.setByContentId(platform, contentId, url, data, {
    skipCache,
    isStory,
  });

  cacheSet(platform, url, data, isStory).catch(() => {
    // Silently fail - caching is optional
  });
}

let clientCacheInitPromise: Promise<void> | null = null;

async function ensureClientCacheReady(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  if (!clientCacheInitPromise) {
    clientCacheInitPromise = initCache()
      .then(async () => {
        await cleanupClientCache();
      })
      .catch(() => {
        clientCacheInitPromise = null;
      });
  }

  await clientCacheInitPromise;
}

/**
 * Fetch media with caching (standalone function)
 */
export async function fetchMediaWithCache(
  url: string,
  cookie?: string,
  skipCache = false
): Promise<ScraperResult> {
  const platform = platformDetect(url) as PlatformId | null;
  const hasCookie = typeof cookie === 'string' && cookie.trim().length > 0;
  const shouldSkipCache = skipCache || hasCookie;

  await ensureClientCacheReady();

  // Try cache first
  if (!shouldSkipCache && platform) {
    try {
      const cached = await getCachedMediaByContentId(platform, url, shouldSkipCache);
      if (hasUsableFormats(cached)) {
        return {
          success: true,
          data: cached,
          fromCache: true,
        };
      }
    } catch {
      // Cache error - continue to API
    }
  }

  // Fetch from API
  try {
      const result = await requestScraper(url, cookie);

      // Cache successful result
      if (result.success && result.data && platform) {
        setCachedMediaByContentId(platform, url, result.data, shouldSkipCache);
      }

    return {
      success: result.success,
      data: result.data,
      responseJson: result.responseJson,
      error: result.error,
      errorCode: result.errorCode,
      errorMetadata: result.errorMetadata,
      fromCache: false,
    };
  } catch (error) {
    const baseError = error instanceof RetryExhaustedError ? error.metadata.lastError : error;
    return {
      success: false,
      error: baseError instanceof Error ? baseError.message : 'Request failed',
      errorCode: getApiErrorCode(baseError),
      errorMetadata: getApiErrorMetadata(error),
      fromCache: false,
    };
  }
}
