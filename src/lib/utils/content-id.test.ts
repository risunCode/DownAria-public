import { describe, expect, it } from 'vitest';
import {
  extractContentId,
  isStoryLikeContent,
  makeContentCacheKey,
} from './content-id';

describe('extractContentId', () => {
  it('extracts youtube watch id', () => {
    const id = extractContentId('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(id).toBe('dQw4w9WgXcQ');
  });

  it('extracts instagram story id with prefix', () => {
    const id = extractContentId('instagram', 'https://www.instagram.com/stories/demo/1234567890');
    expect(id).toBe('story:1234567890');
  });

  it('extracts twitter status id', () => {
    const id = extractContentId('twitter', 'https://x.com/example/status/1881234567890123456');
    expect(id).toBe('1881234567890123456');
  });

  it('returns null when pattern does not match', () => {
    const id = extractContentId('youtube', 'https://www.youtube.com/channel/UC123');
    expect(id).toBeNull();
  });
});

describe('content-id helpers', () => {
  it('builds platform-scoped cache key', () => {
    expect(makeContentCacheKey('youtube', 'dQw4w9WgXcQ')).toBe('youtube:dQw4w9WgXcQ');
  });

  it('detects story URLs and story content IDs', () => {
    expect(isStoryLikeContent('https://www.instagram.com/stories/demo/123', '123')).toBe(true);
    expect(isStoryLikeContent('https://www.instagram.com/reel/abc', 'story:123')).toBe(true);
    expect(isStoryLikeContent('https://www.instagram.com/reel/abc', 'abc')).toBe(false);
  });
});
