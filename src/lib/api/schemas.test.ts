import { describe, expect, it } from 'vitest';
import { validateExtractResponse } from './schemas';

describe('validateExtractResponse', () => {
  it('accepts a valid success response', () => {
    const result = validateExtractResponse({
      success: true,
      data: {
        url: 'https://example.com',
        platform: 'instagram',
        mediaType: 'post',
        author: { name: 'A', handle: 'b' },
        content: { id: '1', text: 't', description: 'd', createdAt: '2026-03-03T00:00:00Z' },
        engagement: { views: 1, likes: 2, comments: 3, shares: 4, bookmarks: 0 },
        media: [
          {
            index: 0,
            type: 'video',
            thumbnail: 'https://example.com/thumb.jpg',
            variants: [{ quality: 'HD', url: 'https://example.com/video.mp4', format: 'mp4' }],
          },
        ],
        authentication: { used: false, source: 'none', requiresCookie: false },
      },
      meta: { responseTime: 10 },
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(() =>
      validateExtractResponse({
        success: true,
        data: {
          platform: 'instagram',
        },
      }),
    ).toThrow();
  });

  it('rejects invalid URLs', () => {
    expect(() =>
      validateExtractResponse({
        success: true,
        data: {
          url: 'not-a-url',
          platform: 'instagram',
          author: {},
          content: {},
          engagement: {},
          media: [{ index: 0, variants: [{ quality: 'HD', url: 'https://example.com/video.mp4' }] }],
          authentication: {},
        },
      }),
    ).toThrow();
  });

  it('rejects empty variants array', () => {
    expect(() =>
      validateExtractResponse({
        success: true,
        data: {
          url: 'https://example.com',
          platform: 'instagram',
          author: {},
          content: {},
          engagement: {},
          media: [{ index: 0, variants: [] }],
          authentication: {},
        },
      }),
    ).toThrow();
  });

  it('rejects negative engagement values', () => {
    expect(() =>
      validateExtractResponse({
        success: true,
        data: {
          url: 'https://example.com',
          platform: 'instagram',
          author: {},
          content: {},
          engagement: { likes: -1 },
          media: [{ index: 0, variants: [{ quality: 'HD', url: 'https://example.com/video.mp4' }] }],
          authentication: {},
        },
      }),
    ).toThrow();
  });

  it('accepts valid error response', () => {
    const result = validateExtractResponse({
      success: false,
      error: {
        category: 'RATE_LIMIT',
        code: 'RATE_LIMITED_429',
        message: 'Too many requests',
        metadata: {
          retryAfter: 60,
          resetAt: 123,
        },
      },
    });

    expect(result.success).toBe(false);
  });
});
