import { afterEach, describe, expect, it, vi } from 'vitest';
import { RetryExhaustedError, isRetryableError, retryWithBackoff } from './retry';

describe('isRetryableError', () => {
  it('returns true for retryable transport errors', () => {
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ code: 'TIMEOUT' })).toBe(true);
    expect(isRetryableError({ category: 'NETWORK' })).toBe(true);
  });

  it('returns false for non-retryable validation/auth errors', () => {
    expect(isRetryableError({ status: 401, code: 'LOGIN_REQUIRED' })).toBe(false);
    expect(isRetryableError({ code: 'INVALID_URL' })).toBe(false);
  });
});

describe('retryWithBackoff', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies exponential backoff for retryable failures', async () => {
    const delays: number[] = [];
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((cb: () => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      cb();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw { status: 500 };
        }
        return 'ok';
      },
      { maxAttempts: 3, baseDelayMs: 100 },
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
    expect(delays).toEqual([100, 200]);
    expect(timeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('uses Retry-After metadata for rate limit retries', async () => {
    const delays: number[] = [];
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((cb: () => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      cb();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    let attempts = 0;
    await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw {
            status: 429,
            category: 'RATE_LIMIT',
            metadata: {
              retryAfter: 2,
            },
          };
        }

        return 'done';
      },
      { maxAttempts: 2, baseDelayMs: 100 },
    );

    expect(delays).toEqual([2000]);
  });

  it('returns result when operation succeeds on retry', async () => {
    let attempts = 0;

    const value = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('network failed to fetch');
        }
        return 42;
      },
      { maxAttempts: 3, baseDelayMs: 1 },
    );

    expect(value).toBe(42);
    expect(attempts).toBe(2);
  });

  it('throws exhausted error with attempt metadata', async () => {
    const rootError = { status: 503, code: 'UPSTREAM_ERROR' };

    await expect(
      retryWithBackoff(
        async () => {
          throw rootError;
        },
        { maxAttempts: 2, baseDelayMs: 50 },
      ),
    ).rejects.toMatchObject({
      name: 'RetryExhaustedError',
      metadata: {
        attempts: 2,
        maxAttempts: 2,
        baseDelayMs: 50,
        delaysMs: [50],
        lastError: rootError,
      },
    });

    await expect(
      retryWithBackoff(
        async () => {
          throw rootError;
        },
        { maxAttempts: 2, baseDelayMs: 50 },
      ),
    ).rejects.toBeInstanceOf(RetryExhaustedError);
  });
});
