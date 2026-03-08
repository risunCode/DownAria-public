import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createErrorDisplayModel,
  ErrorActionTypes,
  executeErrorAction,
} from './handler';

describe('createErrorDisplayModel', () => {
  it('maps category from error code when category is missing', () => {
    const model = createErrorDisplayModel({ code: 'RATE_LIMITED' });

    expect(model.category).toBe('RATE_LIMIT');
    expect(model.title).toBe('Rate Limit Reached');
    expect(model.actions[0].type).toBe(ErrorActionTypes.WAIT_AND_RETRY);
  });

  it('prefers explicit category over inferred code category', () => {
    const model = createErrorDisplayModel({
      code: 'RATE_LIMITED',
      category: 'NETWORK',
    });

    expect(model.category).toBe('NETWORK');
    expect(model.title).toBe('Network Error');
    expect(model.actions[0].type).toBe(ErrorActionTypes.RETRY);
  });

  it('builds retry countdown action from metadata for rate limits', () => {
    const model = createErrorDisplayModel({
      category: 'RATE_LIMIT',
      code: 'RATE_LIMITED',
      metadata: { retryAfter: 12.9 },
    });

    expect(model.actions[0]).toMatchObject({
      type: ErrorActionTypes.WAIT_AND_RETRY,
      label: 'Retry in 12s',
      retryAfterSeconds: 12,
    });
  });

  it('prefers backend error detail over generic code message', () => {
    const model = createErrorDisplayModel({
      code: 'EXTRACTION_FAILED',
      message: 'yt-dlp execution failed: Sign in to confirm you are not a bot.',
    });

    expect(model.title).toBe('Extraction Failed');
    expect(model.message).toBe('yt-dlp execution failed: Sign in to confirm you are not a bot.');
  });
});

describe('executeErrorAction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('invokes retry handler immediately for RETRY action', () => {
    const onRetry = vi.fn();

    executeErrorAction(
      { type: ErrorActionTypes.RETRY, label: 'Try Again' },
      { onRetry },
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('delays retry for WAIT_AND_RETRY action', () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();

    executeErrorAction(
      { type: ErrorActionTypes.WAIT_AND_RETRY, label: 'Retry in 3s', retryAfterSeconds: 3 },
      { onRetry },
    );

    expect(onRetry).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2999);
    expect(onRetry).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('routes non-retry actions to matching handlers', () => {
    const onOpenSettings = vi.fn();
    const onDismiss = vi.fn();

    executeErrorAction(
      { type: ErrorActionTypes.OPEN_SETTINGS, label: 'Open Settings' },
      { onOpenSettings, onDismiss },
    );
    executeErrorAction(
      { type: ErrorActionTypes.DISMISS, label: 'Dismiss' },
      { onOpenSettings, onDismiss },
    );

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
