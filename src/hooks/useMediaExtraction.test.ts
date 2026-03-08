import { describe, expect, it, vi } from 'vitest';
import type { MediaData } from '../lib/types';
import {
  createMediaExtractionInitialState,
  defaultCookieResolver,
  mediaExtractionReducer,
  retryLastExtraction,
} from './useMediaExtraction';
import { parseCookieInputToFlat } from '@/lib/utils/cookie-parser';

const mediaFixture: MediaData = {
  title: 'Sample',
  thumbnail: 'https://example.com/thumb.jpg',
  formats: [
    {
      quality: '720p',
      type: 'video',
      url: 'https://example.com/video.mp4',
    },
  ],
  url: 'https://example.com/post/1',
};

describe('mediaExtractionReducer', () => {
  it('increments attempts and enters loading state on extract start', () => {
    const state = createMediaExtractionInitialState('facebook');

    const next = mediaExtractionReducer(state, {
      type: 'EXTRACT_START',
      payload: 'instagram',
    });

    expect(next.platform).toBe('instagram');
    expect(next.isLoading).toBe(true);
    expect(next.mediaData).toBeNull();
    expect(next.error).toBeNull();
    expect(next.responseJson).toBeNull();
    expect(next.attempts).toBe(1);
  });

  it('stores media payload and clears error on success', () => {
    const loadingState = {
      ...createMediaExtractionInitialState('facebook'),
      isLoading: true,
      attempts: 2,
    };

    const next = mediaExtractionReducer(loadingState, {
      type: 'EXTRACT_SUCCESS',
      payload: {
        platform: 'facebook',
        mediaData: mediaFixture,
        responseJson: { raw: true },
      },
    });

    expect(next.isLoading).toBe(false);
    expect(next.mediaData).toEqual(mediaFixture);
    expect(next.responseJson).toEqual({ raw: true });
    expect(next.error).toBeNull();
    expect(next.attempts).toBe(2);
  });

  it('stores normalized error and clears media on failure', () => {
    const loadingState = {
      ...createMediaExtractionInitialState('facebook'),
      isLoading: true,
      mediaData: mediaFixture,
      attempts: 1,
    };

    const next = mediaExtractionReducer(loadingState, {
      type: 'EXTRACT_ERROR',
      payload: {
        category: 'NETWORK',
        title: 'Network Error',
        message: 'Request timed out',
        actions: [],
        code: 'TIMEOUT',
      },
    });

    expect(next.isLoading).toBe(false);
    expect(next.mediaData).toBeNull();
    expect(next.responseJson).toBeNull();
    expect(next.error?.code).toBe('TIMEOUT');
    expect(next.attempts).toBe(1);
  });

  it('resets transient state and keeps selected platform', () => {
    const busyState = {
      ...createMediaExtractionInitialState('tiktok'),
      isLoading: true,
      mediaData: mediaFixture,
      attempts: 4,
    };

    const next = mediaExtractionReducer(busyState, { type: 'RESET' });

    expect(next.platform).toBe('tiktok');
    expect(next.isLoading).toBe(false);
    expect(next.mediaData).toBeNull();
    expect(next.error).toBeNull();
    expect(next.responseJson).toBeNull();
    expect(next.attempts).toBe(0);
  });
});

describe('retryLastExtraction', () => {
  it('replays last request when retry data exists', async () => {
    const extract = vi.fn().mockResolvedValue(undefined);

    await retryLastExtraction(
      { url: 'https://example.com/retry', skipCache: true },
      extract,
    );

    expect(extract).toHaveBeenCalledTimes(1);
    expect(extract).toHaveBeenCalledWith('https://example.com/retry', true);
  });

  it('is a no-op when no previous request exists', async () => {
    const extract = vi.fn().mockResolvedValue(undefined);

    await retryLastExtraction(null, extract);

    expect(extract).not.toHaveBeenCalled();
  });
});

describe('defaultCookieResolver', () => {
  it('returns twitter cookie when twitter platform is detected', () => {
    const resolver = vi.fn((platform: 'facebook' | 'instagram' | 'twitter' | 'youtube') => {
      if (platform === 'twitter') {
        return 'auth_token=abc; ct0=xyz';
      }
      return null;
    });

    const cookie = defaultCookieResolver('twitter', resolver);

    expect(cookie).toBe('auth_token=abc; ct0=xyz');
    expect(resolver).toHaveBeenCalledWith('twitter');
  });

  it('returns youtube cookie when youtube platform is detected', () => {
    const resolver = vi.fn((platform: 'facebook' | 'instagram' | 'twitter' | 'youtube') => {
      if (platform === 'youtube') {
        return 'VISITOR_INFO1_LIVE=abc123';
      }
      return null;
    });

    const cookie = defaultCookieResolver('youtube', resolver);

    expect(cookie).toBe('VISITOR_INFO1_LIVE=abc123');
    expect(resolver).toHaveBeenCalledWith('youtube');
  });

  it('returns undefined for platforms without cookie lane support', () => {
    const resolver = vi.fn(() => 'sid=unused');

    const cookie = defaultCookieResolver('tiktok', resolver);

    expect(cookie).toBeUndefined();
    expect(resolver).not.toHaveBeenCalled();
  });
});

describe('youtube cookie conversion', () => {
  it('converts exported JSON cookies into a flat cookie header', () => {
    const flat = parseCookieInputToFlat(JSON.stringify([
      { domain: '.youtube.com', name: 'SID', value: 'sid-value' },
      { domain: '.youtube.com', name: 'SAPISID', value: 'sapisid-value' },
      { domain: '.youtube.com', name: 'LOGIN_INFO', value: 'login-info' },
    ]), 'youtube');

    expect(flat).toContain('SID=sid-value');
    expect(flat).toContain('SAPISID=sapisid-value');
    expect(flat).toContain('LOGIN_INFO=login-info');
  });
});
