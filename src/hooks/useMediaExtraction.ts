'use client';

import { useCallback, useReducer, useRef } from 'react';
import type { MediaData, PlatformId } from '../lib/types';
import { createErrorDisplayModel, type ErrorDisplayModel } from '../lib/errors';
import { ErrorCodes } from '../lib/errors/codes';
import { getPlatformCookie, getSkipCache } from '../lib/storage';
import { platformDetect, sanitizeUrl } from '../lib/utils/format';
import { fetchMediaWithCache } from './useScraperCache';

type FetchMediaResult = Awaited<ReturnType<typeof fetchMediaWithCache>>;

export interface MediaExtractionError extends ErrorDisplayModel {
  code?: string;
  metadata?: Record<string, unknown>;
  rawMessage?: string;
}

export interface MediaExtractionState {
  platform: PlatformId;
  isLoading: boolean;
  mediaData: MediaData | null;
  error: MediaExtractionError | null;
  responseJson: unknown;
  attempts: number;
}

type MediaExtractionAction =
  | { type: 'SET_PLATFORM'; payload: PlatformId }
  | { type: 'EXTRACT_START'; payload: PlatformId }
  | {
    type: 'EXTRACT_SUCCESS';
    payload: {
      platform: PlatformId;
      mediaData: MediaData;
      responseJson: unknown;
    };
  }
  | { type: 'EXTRACT_ERROR'; payload: MediaExtractionError }
  | { type: 'RESET' };

export interface LastMediaExtractionRequest {
  url: string;
  skipCache?: boolean;
}

export function createMediaExtractionInitialState(platform: PlatformId = 'facebook'): MediaExtractionState {
  return {
    platform,
    isLoading: false,
    mediaData: null,
    error: null,
    responseJson: null,
    attempts: 0,
  };
}

export function mediaExtractionReducer(
  state: MediaExtractionState,
  action: MediaExtractionAction,
): MediaExtractionState {
  if (action.type === 'SET_PLATFORM') {
    return {
      ...state,
      platform: action.payload,
    };
  }

  if (action.type === 'EXTRACT_START') {
    return {
      ...state,
      platform: action.payload,
      isLoading: true,
      mediaData: null,
      error: null,
      responseJson: null,
      attempts: state.attempts + 1,
    };
  }

  if (action.type === 'EXTRACT_SUCCESS') {
    return {
      ...state,
      platform: action.payload.platform,
      isLoading: false,
      mediaData: action.payload.mediaData,
      error: null,
      responseJson: action.payload.responseJson,
    };
  }

  if (action.type === 'EXTRACT_ERROR') {
    return {
      ...state,
      isLoading: false,
      mediaData: null,
      error: action.payload,
      responseJson: null,
    };
  }

  return {
    ...createMediaExtractionInitialState(state.platform),
  };
}

function toMediaExtractionError(input: {
  code?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}): MediaExtractionError {
  const model = createErrorDisplayModel({
    code: input.code,
    message: input.message,
    metadata: input.metadata,
  });

  return {
    ...model,
    code: input.code,
    metadata: input.metadata,
    rawMessage: input.message,
  };
}

export async function retryLastExtraction(
  lastRequest: LastMediaExtractionRequest | null,
  extract: (url: string, skipCache?: boolean) => Promise<void>,
): Promise<void> {
  if (!lastRequest) return;
  await extract(lastRequest.url, lastRequest.skipCache);
}

export function defaultCookieResolver(
  platform: PlatformId,
  resolver: (platform: 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'weibo') => string | null = getPlatformCookie,
): string | undefined {
  if (platform === 'weibo') {
    return resolver('weibo') || undefined;
  }

  if (platform === 'facebook' || platform === 'instagram' || platform === 'twitter' || platform === 'youtube') {
    return resolver(platform) || undefined;
  }

  return undefined;
}

export interface UseMediaExtractionOptions {
  initialPlatform?: PlatformId;
  fetcher?: typeof fetchMediaWithCache;
  detectPlatform?: (url: string) => string | null;
  sanitizeInputUrl?: (url: string) => string;
  getSkipCacheValue?: () => boolean;
  getCookieForPlatform?: (platform: PlatformId) => string | undefined;
}

export interface UseMediaExtractionResult extends MediaExtractionState {
  extract: (url: string, skipCache?: boolean) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  setPlatform: (platform: PlatformId) => void;
}

export function useMediaExtraction(options: UseMediaExtractionOptions = {}): UseMediaExtractionResult {
  const {
    initialPlatform = 'facebook',
    fetcher = fetchMediaWithCache,
    detectPlatform = platformDetect,
    sanitizeInputUrl = sanitizeUrl,
    getSkipCacheValue = getSkipCache,
    getCookieForPlatform = defaultCookieResolver,
  } = options;

  const [state, dispatch] = useReducer(
    mediaExtractionReducer,
    initialPlatform,
    createMediaExtractionInitialState,
  );
  const lastRequestRef = useRef<LastMediaExtractionRequest | null>(null);

  const setPlatform = useCallback((platform: PlatformId) => {
    dispatch({ type: 'SET_PLATFORM', payload: platform });
  }, []);

  const reset = useCallback(() => {
    lastRequestRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  const extract = useCallback(async (url: string, skipCache?: boolean) => {
    const sanitizedUrl = sanitizeInputUrl(url);
    const detectedPlatform = detectPlatform(sanitizedUrl) as PlatformId | null;
    const platform = detectedPlatform || state.platform;
    const shouldSkipCache = typeof skipCache === 'boolean' ? skipCache : getSkipCacheValue();

    lastRequestRef.current = { url, skipCache };
    dispatch({ type: 'EXTRACT_START', payload: platform });

    try {
      const cookie = getCookieForPlatform(platform);
      const result = await fetcher(sanitizedUrl, cookie, shouldSkipCache);

      if (result.success && result.data) {
        const mediaResult: MediaData = {
          ...result.data,
          usedCookie: result.data.usedCookie === true,
        };

        dispatch({
          type: 'EXTRACT_SUCCESS',
          payload: {
            platform,
            mediaData: mediaResult,
            responseJson: result.responseJson ?? mediaResult,
          },
        });
        return;
      }

      dispatch({
        type: 'EXTRACT_ERROR',
        payload: toMediaExtractionError({
          code: result.errorCode,
          message: result.error,
          metadata: result.errorMetadata,
        }),
      });
    } catch (error) {
      const fallback = error instanceof Error ? error.message : 'Request failed';
      const code = typeof (error as { code?: unknown })?.code === 'string'
        ? (error as { code: string }).code
        : ErrorCodes.UNKNOWN;

      dispatch({
        type: 'EXTRACT_ERROR',
        payload: toMediaExtractionError({
          code,
          message: fallback,
        }),
      });
    }
  }, [
    detectPlatform,
    fetcher,
    getCookieForPlatform,
    getSkipCacheValue,
    sanitizeInputUrl,
    state.platform,
  ]);

  const retry = useCallback(async () => {
    await retryLastExtraction(lastRequestRef.current, extract);
  }, [extract]);

  return {
    ...state,
    extract,
    retry,
    reset,
    setPlatform,
  };
}
