import { describe, expect, it } from 'vitest';

import { toSafeExternalHttpUrl } from './urls';

describe('toSafeExternalHttpUrl', () => {
  it('accepts regular https URLs', () => {
    expect(toSafeExternalHttpUrl('https://example.com/video')).toBe('https://example.com/video');
  });

  it('blocks cloudflare workers mirror hosts', () => {
    expect(toSafeExternalHttpUrl('https://mirror.workers.dev/video')).toBeNull();
    expect(toSafeExternalHttpUrl('https://workers.dev/video')).toBeNull();
  });

  it('blocks cloudflare workers mirror hosts with trailing dot', () => {
    expect(toSafeExternalHttpUrl('https://mirror.workers.dev./video')).toBeNull();
  });
});
