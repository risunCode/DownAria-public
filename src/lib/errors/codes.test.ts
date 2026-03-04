import { describe, expect, it } from 'vitest';
import {
  ErrorCategories,
  ErrorCodes,
  getErrorCategory,
  getErrorMessage,
  isAuthError,
  isRetryableError,
} from './codes';

describe('error code mappings', () => {
  it('maps backend generic codes to frontend categories', () => {
    expect(getErrorCategory(ErrorCodes.AUTH_REQUIRED)).toBe(ErrorCategories.AUTH);
    expect(getErrorCategory(ErrorCodes.PLATFORM_NOT_FOUND)).toBe(ErrorCategories.NOT_FOUND);
    expect(getErrorCategory(ErrorCodes.NETWORK_ERROR)).toBe(ErrorCategories.NETWORK);
    expect(getErrorCategory(ErrorCodes.EXTRACTION_FAILED)).toBe(ErrorCategories.EXTRACTION_FAILED);
    expect(getErrorCategory(ErrorCodes.RATE_LIMITED_429)).toBe(ErrorCategories.RATE_LIMIT);
  });

  it('uses safe fallback category for unknown codes', () => {
    expect(getErrorCategory('UNRECOGNIZED_CODE')).toBe(ErrorCategories.EXTRACTION_FAILED);
    expect(getErrorCategory(undefined)).toBe(ErrorCategories.EXTRACTION_FAILED);
  });
});

describe('error message fallback behavior', () => {
  it('returns mapped message for known backend generic codes', () => {
    expect(getErrorMessage(ErrorCodes.AUTH_REQUIRED)).toContain('Authentication required');
    expect(getErrorMessage(ErrorCodes.RATE_LIMITED_429)).toContain('Too many requests');
  });

  it('falls back safely for unknown or missing code', () => {
    expect(getErrorMessage('UNRECOGNIZED_CODE')).toBe('An unexpected error occurred. Please try again.');
    expect(getErrorMessage('UNRECOGNIZED_CODE', 'Fallback message')).toBe('Fallback message');
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred. Please try again.');
  });
});

describe('error helpers', () => {
  it('marks backend auth code as auth error', () => {
    expect(isAuthError(ErrorCodes.AUTH_REQUIRED)).toBe(true);
  });

  it('marks backend rate limit and network codes as retryable', () => {
    expect(isRetryableError(ErrorCodes.RATE_LIMITED_429)).toBe(true);
    expect(isRetryableError(ErrorCodes.NETWORK_ERROR)).toBe(true);
  });
});
