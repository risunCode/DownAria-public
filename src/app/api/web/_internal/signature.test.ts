import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildWebSignatureHeaders } from './signature';

describe('buildWebSignatureHeaders', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps compatibility contract header names', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const headers = buildWebSignatureHeaders('shared-secret', 'post', '/api/web/extract', '{"url":"https://example.com"}');

    expect(Object.keys(headers).sort()).toEqual([
      'X-Downaria-Nonce',
      'X-Downaria-Signature',
      'X-Downaria-Timestamp',
    ]);
    expect(headers['X-Downaria-Timestamp']).toBe('1700000000');
    expect(headers['X-Downaria-Nonce']).toMatch(/^[a-f0-9]{32}$/);
    expect(headers['X-Downaria-Signature']).toMatch(/^[a-f0-9]{64}$/);
  });
});
