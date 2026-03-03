import { describe, expect, it, vi } from 'vitest';
import type { MediaData } from '../lib/types';
import {
  createMediaExtractionInitialState,
  mediaExtractionReducer,
  retryLastExtraction,
} from './useMediaExtraction';

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
