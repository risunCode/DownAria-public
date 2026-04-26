import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type BackendExtractData, type BackendResponse } from '@/infra/api/types';

import { asPlatformId, buildPreviewDownloadRequest, getPreviewFormatById, persistExtractHistory, toPreviewResult } from './preview';

const addHistoryMock = vi.hoisted(() => vi.fn());

vi.mock('@/infra/storage/indexed-db', async () => {
  const actual = await vi.importActual<typeof import('@/infra/storage/indexed-db')>('@/infra/storage/indexed-db');
  return {
    ...actual,
    addHistory: addHistoryMock,
  };
});

const extractData: BackendExtractData = {
  url: 'https://www.youtube.com/watch?v=abc123',
  platform: 'youtube',
  extract_profile: 'generic',
  content_type: 'post',
  title: 'Example Video',
  author: { name: 'Example Author', handle: '@example' },
  thumbnail_url: 'https://example.com/thumb.jpg',
  filename: 'example-video.mp4',
  media: [
    {
      index: 0,
      type: 'video',
      filename: 'example-video-01.mp4',
      thumbnail_url: 'https://example.com/thumb.jpg',
      sources: [
        {
          quality: '1080p',
          url: 'https://cdn.example.com/video-only.mp4',
          mime_type: 'video/mp4',
          file_size_bytes: 10_000_000,
          stream_profile: 'video_only_adaptive',
        },
        {
          quality: 'audio',
          url: 'https://cdn.example.com/audio.m4a',
          mime_type: 'audio/mp4',
          file_size_bytes: 2_000_000,
          stream_profile: 'audio_only',
        },
      ],
    },
  ],
};

const mockResponse: BackendResponse<BackendExtractData> = {
  success: true,
  response_time_ms: 123,
  data: extractData,
};

describe('preview helpers', () => {
  beforeEach(() => {
    addHistoryMock.mockReset();
  });

  it('returns a safe empty preview when response data is missing', () => {
    const preview = toPreviewResult({
      success: false,
      response_time_ms: 42,
      error: { message: 'missing payload' },
    });

    expect(preview.items).toHaveLength(0);
    expect(preview.sourceUrl).toBe('');
    expect(preview.title).toBe('missing payload');
    expect(preview.platform).toBe('unknown');
  });

  it('maps extract data into preview items and synthetic audio formats', () => {
    const preview = toPreviewResult(mockResponse);

    expect(preview.title).toBe('Example Video');
    expect(preview.items).toHaveLength(1);
    expect(preview.items[0].formats.some((format) => format.requestedAudioFormat === 'mp3')).toBe(true);
    expect(preview.items[0].formats.some((format) => format.container === 'mp4' || format.container === 'm4a')).toBe(true);
    expect(preview.items[0].formats.find((format) => format.sourceUrl.endsWith('video-only.mp4'))).toMatchObject({
      hasAudio: false,
      hasVideo: true,
      needsMerge: true,
    });
    expect(preview.items[0].formats.find((format) => format.sourceUrl.endsWith('audio.m4a'))).toMatchObject({
      hasAudio: true,
      hasVideo: false,
    });
  });

  it('skips media entries with no sources', () => {
    const preview = toPreviewResult({
      ...mockResponse,
      data: {
        ...extractData,
        media: [
          ...extractData.media,
          {
            index: 1,
            type: 'video',
            filename: 'empty.mp4',
            sources: [],
          },
        ],
      },
    });

    expect(preview.items).toHaveLength(1);
  });

  it('builds merge requests for video-only selections', () => {
    const preview = toPreviewResult(mockResponse);
    const item = preview.items[0];
    const videoFormat = getPreviewFormatById(item, item.formats.find((format) => format.kind === 'video')!.id)!;

    const request = buildPreviewDownloadRequest(preview, item, videoFormat);

    expect(request.video_url).toBe('https://cdn.example.com/video-only.mp4');
    expect(request.audio_url).toBe('https://cdn.example.com/audio.m4a');
    expect(request.async).toBe(true);
  });

  it('builds async mp4 requests for HLS video selections', () => {
    const preview = toPreviewResult({
      ...mockResponse,
      data: {
        ...extractData,
        media: [
          {
            index: 0,
            type: 'video',
            filename: 'hls-video.mp4',
            sources: [
              {
                quality: '720p',
                url: 'https://cdn.example.com/master.m3u8',
                mime_type: 'application/vnd.apple.mpegurl',
                stream_profile: 'muxed_adaptive',
              },
            ],
          },
        ],
      },
    });
    const item = preview.items[0];
    const videoFormat = getPreviewFormatById(item, item.formats.find((format) => format.kind === 'video')!.id)!;

    const request = buildPreviewDownloadRequest(preview, item, videoFormat);

    expect(request).toMatchObject({
      url: 'https://cdn.example.com/master.m3u8',
      format: 'mp4',
      async: true,
    });
  });

  it('persists history entry when extraction succeeds', async () => {
    await persistExtractHistory(mockResponse);

    expect(addHistoryMock).toHaveBeenCalledTimes(1);
    expect(addHistoryMock).toHaveBeenCalledWith(expect.objectContaining({
      platform: 'youtube',
      contentId: 'https://www.youtube.com/watch?v=abc123',
      resolvedUrl: 'https://www.youtube.com/watch?v=abc123',
      title: 'Example Video',
      quality: '1080p',
      type: 'video',
    }));
  });

  it('skips history persistence when extract response has no data', async () => {
    await persistExtractHistory({
      success: false,
      response_time_ms: 5,
      error: { message: 'failed' },
    });

    expect(addHistoryMock).not.toHaveBeenCalled();
  });
});

describe('asPlatformId', () => {
  it('returns unknown for empty string', () => {
    expect(asPlatformId('')).toBe('unknown');
  });

  it('returns unknown for unrecognized platform string', () => {
    expect(asPlatformId('myspace')).toBe('unknown');
  });

  it('returns the platform id for a known platform', () => {
    expect(asPlatformId('youtube')).toBe('youtube');
  });
});
