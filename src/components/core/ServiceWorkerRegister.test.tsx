// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { forceRefresh } from './ServiceWorkerRegister';

describe('forceRefresh', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('cache_demo', '1');
    localStorage.setItem('xtf_cache_demo', '1');
    localStorage.setItem('keep_me', '1');
  });

  it('clears caches, unregisters workers, removes transient cache keys, and reloads', async () => {
    const deleteSpy = vi.fn().mockResolvedValue(true);
    const unregisterSpy = vi.fn().mockResolvedValue(true);
    const reloadSpy = vi.fn();

    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['v1', 'v2']),
      delete: deleteSpy,
    });

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([{ unregister: unregisterSpy }]),
      },
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy },
    });

    await forceRefresh();

    expect(deleteSpy).toHaveBeenCalledTimes(2);
    expect(unregisterSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('cache_demo')).toBeNull();
    expect(localStorage.getItem('xtf_cache_demo')).toBeNull();
    expect(localStorage.getItem('keep_me')).toBe('1');
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
