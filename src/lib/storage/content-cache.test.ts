import { describe, expect, it } from 'vitest';
import { createContentCache } from './content-cache';

describe('ContentCache', () => {
  it('returns cached entry before TTL and expires after TTL', () => {
    const cache = createContentCache({ maxEntries: 10 });
    const now = 1_000;

    cache.setByUrl('instagram', 'https://www.instagram.com/reel/abc123', { v: 1 }, { now, ttlMs: 200 });

    expect(cache.getByUrl<{ v: number }>('instagram', 'https://www.instagram.com/reel/abc123', { now: 1_100 })).toEqual({ v: 1 });
    expect(cache.getByUrl<{ v: number }>('instagram', 'https://www.instagram.com/reel/abc123', { now: 1_300 })).toBeNull();
  });

  it('uses per-platform TTL defaults', () => {
    const cache = createContentCache({ maxEntries: 10 });
    const now = 10_000;

    cache.setByUrl('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', { p: 'yt' }, { now });
    cache.setByUrl('instagram', 'https://www.instagram.com/reel/abc123', { p: 'ig' }, { now });

    expect(cache.getByUrl('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', { now: now + 3 * 60 * 1000 })).toBeNull();
    expect(cache.getByUrl('instagram', 'https://www.instagram.com/reel/abc123', { now: now + 3 * 60 * 1000 })).toEqual({ p: 'ig' });
  });

  it('evicts least recently used item when max is exceeded', () => {
    const cache = createContentCache({ maxEntries: 2 });
    const now = 5_000;

    cache.setByUrl('instagram', 'https://www.instagram.com/reel/a1', { id: 'a1' }, { now });
    cache.setByUrl('instagram', 'https://www.instagram.com/reel/b2', { id: 'b2' }, { now: now + 1 });

    cache.getByUrl('instagram', 'https://www.instagram.com/reel/a1', { now: now + 2 });

    cache.setByUrl('instagram', 'https://www.instagram.com/reel/c3', { id: 'c3' }, { now: now + 3 });

    expect(cache.getByUrl('instagram', 'https://www.instagram.com/reel/a1', { now: now + 4 })).toEqual({ id: 'a1' });
    expect(cache.getByUrl('instagram', 'https://www.instagram.com/reel/b2', { now: now + 4 })).toBeNull();
    expect(cache.getByUrl('instagram', 'https://www.instagram.com/reel/c3', { now: now + 4 })).toEqual({ id: 'c3' });
  });

  it('supports skip-cache entry points on set and get', () => {
    const cache = createContentCache({ maxEntries: 10 });

    const setResult = cache.setByUrl(
      'instagram',
      'https://www.instagram.com/reel/skip1',
      { id: 'skip' },
      { now: 100, skipCache: true },
    );
    expect(setResult).toBe(false);

    cache.setByUrl('instagram', 'https://www.instagram.com/reel/live1', { id: 'live' }, { now: 100 });
    const getResult = cache.getByUrl('instagram', 'https://www.instagram.com/reel/live1', {
      now: 101,
      skipCache: true,
    });
    expect(getResult).toBeNull();
  });
});
