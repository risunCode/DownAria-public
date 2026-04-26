/**
 * Centralized Configuration
 * Single source of truth for environment variables and constants
 */

function normalizeUrl(value: string | undefined): string {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  return trimmed.replace(/\/+$/, '');
}

export const IS_DEV = process.env.NODE_ENV === 'development';
export const IS_PROD = process.env.NODE_ENV === 'production';
export const IS_VERCEL = Boolean(process.env.VERCEL);

export const BASE_URL = normalizeUrl(process.env.NEXT_PUBLIC_BASE_URL);
export const BASE_URL_WITH_FALLBACK = BASE_URL || 'http://localhost:3001';
