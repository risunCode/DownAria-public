// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type PreviewResult } from '@/modules/downloader/model/preview';
import { runZipDownload } from './batch-download';

vi.mock('jszip', () => ({
  default: class MockZip {
    files: Record<string, unknown> = {};
    folder() {
      return {
        file: vi.fn(),
      };
    }
    generateAsync() {
      return Promise.resolve(new Blob(['mock-zip'], { type: 'application/zip' }));
    }
  },
}));

vi.mock('@/shared/utils/backoff', () => ({
  backoffWithJitter: vi.fn(() => 0),
}));

describe('runZipDownload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:mock-zip');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses preview download request builder output for merge-required formats', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', fetchMock);

    const onProgress = vi.fn();

    const result: PreviewResult = {
      sourceUrl: 'https://example.com/post',
      platform: 'youtube',
      contentType: 'post',
      title: 'Example',
      engagement: {},
      items: [
        {
          id: 'item-0',
          index: 0,
          kind: 'video' as const,
          title: 'Item 1',
          formats: [
            {
              id: 'video-1',
              itemId: 'item-0',
              kind: 'video' as const,
              label: '1080P',
              qualityLabel: '1080p',
              sourceUrl: 'https://cdn.example.com/video-only.mp4',
              needsMerge: true,
              hasAudio: false,
            },
            {
              id: 'audio-1',
              itemId: 'item-0',
              kind: 'audio' as const,
              label: 'M4A',
              qualityLabel: 'Audio',
              sourceUrl: 'https://cdn.example.com/audio.m4a',
              needsMerge: false,
              hasAudio: true,
            },
          ],
          preferredFormatId: 'video-1',
        },
      ],
    };

    await runZipDownload({
      result,
      items: result.items,
      selectedFormatIds: { 'item-0': 'video-1' },
      onProgress,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body.video_url).toBe('https://cdn.example.com/video-only.mp4');
    expect(body.audio_url).toBe('https://cdn.example.com/audio.m4a');
    expect(body.async).toBe(false);
  });

  it('polls async jobs and downloads artifact when /api/download returns 202', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        response_time_ms: 1,
        data: {
          mode: 'async',
          job: {
            id: 'job_123',
            type: 'download',
            state: 'pending',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            status_url: '/api/jobs/job_123',
            artifact_url: '/api/jobs/job_123/artifact',
          },
        },
      }), { status: 202, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        response_time_ms: 1,
        data: {
          id: 'job_123',
          type: 'download',
          state: 'completed',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:10Z',
          status_url: '/api/jobs/job_123',
          artifact_url: '/api/jobs/job_123/artifact',
          artifact: {
            id: 'art_1',
            filename: 'demo.mp4',
            content_type: 'video/mp4',
            content_bytes: 4,
            created_at: '2026-01-01T00:00:00Z',
            expires_at: '2026-01-01T01:00:00Z',
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'Content-Type': 'video/mp4' } }));
    vi.stubGlobal('fetch', fetchMock);

    const onProgress = vi.fn();
    const result: PreviewResult = {
      sourceUrl: 'https://example.com/post',
      platform: 'youtube',
      contentType: 'post',
      title: 'Example',
      engagement: {},
      items: [{
        id: 'item-0',
        index: 0,
        kind: 'video',
        title: 'Item 1',
        formats: [{
          id: 'video-1',
          itemId: 'item-0',
          kind: 'video',
          label: '1080P',
          qualityLabel: '1080p',
          sourceUrl: 'https://cdn.example.com/video.mp4',
          needsMerge: false,
          hasAudio: true,
        }],
        preferredFormatId: 'video-1',
      }],
    };

    await runZipDownload({
      result,
      items: result.items,
      selectedFormatIds: { 'item-0': 'video-1' },
      onProgress,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/jobs/job_123');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/jobs/job_123/artifact');
  });

  it('retries transient async job status failures before downloading ZIP artifact', async () => {
    const transientBody = JSON.stringify({
      success: false,
      response_time_ms: 1,
      error: { message: 'temporarily unavailable' },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        response_time_ms: 1,
        data: {
          mode: 'async',
          job: {
            id: 'job_123',
            type: 'download',
            state: 'pending',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            status_url: '/api/jobs/job_123',
            artifact_url: '/api/jobs/job_123/artifact',
          },
        },
      }), { status: 202, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(transientBody, { status: 503, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(transientBody, { status: 504, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(transientBody, { status: 429, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        response_time_ms: 1,
        data: {
          id: 'job_123',
          type: 'download',
          state: 'completed',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:10Z',
          status_url: '/api/jobs/job_123',
          artifact_url: '/api/jobs/job_123/artifact',
          artifact: {
            id: 'art_1',
            filename: 'demo.mp4',
            content_type: 'video/mp4',
            content_bytes: 4,
            created_at: '2026-01-01T00:00:00Z',
            expires_at: '2026-01-01T01:00:00Z',
          },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'Content-Type': 'video/mp4' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result: PreviewResult = {
      sourceUrl: 'https://example.com/post',
      platform: 'youtube',
      contentType: 'post',
      title: 'Example',
      engagement: {},
      items: [{
        id: 'item-0',
        index: 0,
        kind: 'video',
        title: 'Item 1',
        formats: [{
          id: 'video-1',
          itemId: 'item-0',
          kind: 'video',
          label: '1080P',
          qualityLabel: '1080p',
          sourceUrl: 'https://cdn.example.com/video.mp4',
          needsMerge: false,
          hasAudio: true,
        }],
        preferredFormatId: 'video-1',
      }],
    };

    await runZipDownload({
      result,
      items: result.items,
      selectedFormatIds: { 'item-0': 'video-1' },
      onProgress: vi.fn(),
    });

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls.slice(1, 5).map((call) => call[0])).toEqual([
      '/api/jobs/job_123',
      '/api/jobs/job_123',
      '/api/jobs/job_123',
      '/api/jobs/job_123',
    ]);
    expect(fetchMock.mock.calls[5]?.[0]).toBe('/api/jobs/job_123/artifact');
  });

  it('limits ZIP item downloads to five concurrent requests', async () => {
    let active = 0;
    let maxActive = 0;
    const releases: Array<() => void> = [];
    const fetchMock = vi.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return new Response(new Uint8Array([1]), { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const items = Array.from({ length: 6 }, (_, index) => ({
      id: `item-${index}`,
      index,
      kind: 'image' as const,
      title: `Item ${index}`,
      filename: `item-${index}.jpg`,
      formats: [{
        id: `image-${index}`,
        itemId: `item-${index}`,
        kind: 'image' as const,
        label: 'Image',
        qualityLabel: 'Image',
        sourceUrl: `https://cdn.example.com/${index}.jpg`,
        needsMerge: false,
      }],
      preferredFormatId: `image-${index}`,
    }));
    const result: PreviewResult = {
      sourceUrl: 'https://example.com/post',
      platform: 'instagram',
      contentType: 'post',
      title: 'Example',
      engagement: {},
      items,
    };

    const promise = runZipDownload({
      result,
      items,
      selectedFormatIds: Object.fromEntries(items.map((item) => [item.id, item.preferredFormatId])),
      onProgress: vi.fn(),
    });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(maxActive).toBe(5);
    releases.splice(0).forEach((release) => release());
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(maxActive).toBe(5);
    releases.splice(0).forEach((release) => release());
    await promise;
  });
});
