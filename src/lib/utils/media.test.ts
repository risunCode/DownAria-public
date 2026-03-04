import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MediaData, MediaFormat } from '@/lib/types';
import { downloadMergedByServer, generateFilename } from './media';

const baseData: MediaData = {
  title: 'Sample Video',
  thumbnail: 'https://example.com/thumb.jpg',
  formats: [],
  url: 'https://example.com/post/1',
  author: 'Author',
  description: 'Caption text',
};

const baseFormat: MediaFormat = {
  quality: '1080p',
  type: 'video',
  url: 'https://example.com/video.mp4',
  format: 'mp4',
};

describe('generateFilename compatibility', () => {
  it('keeps DownAria branding suffix and avoids duplicate extension', () => {
    const name = generateFilename(
      {
        ...baseData,
        title: 'My Clip.mp4',
      },
      'youtube',
      {
        ...baseFormat,
        format: 'mp4',
      },
    );

    expect(name).toContain('_[DownAria].');
    expect(name.endsWith('.mp4')).toBe(true);
    expect(name.includes('.mp4.mp4')).toBe(false);
  });
});

describe('downloadMergedByServer filename fallback compatibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to downaria_output.mp4 when payload and headers are empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          'content-type': 'video/mp4',
        },
      }) as unknown as Response,
    );

    const result = await downloadMergedByServer(
      {
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        quality: '1080p',
        filename: '',
      },
      () => undefined,
    );

    expect(result.success).toBe(true);
    expect(result.filename).toBe('downaria_output.mp4');
  });

  it('keeps branded filename from content-disposition when provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([9, 9]), {
        status: 200,
        headers: {
          'content-type': 'video/mp4',
          'content-disposition': "attachment; filename*=UTF-8''clip_%5BDownAria%5D.mp4",
        },
      }) as unknown as Response,
    );

    const result = await downloadMergedByServer(
      {
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        quality: '720p',
      },
      () => undefined,
    );

    expect(result.success).toBe(true);
    expect(result.filename).toBe('clip_[DownAria].mp4');
  });
});
