import { NextResponse } from 'next/server';

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function normalizeOrigin(value: string): string {
  try {
    return trimTrailingSlash(new URL(value).origin);
  } catch {
    return '';
  }
}

function extractOriginFromReferer(value: string): string {
  try {
    return trimTrailingSlash(new URL(value).origin);
  } catch {
    return '';
  }
}

function isBrowserLikeUserAgent(value: string): boolean {
  const ua = value.toLowerCase();
  return ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari') || ua.includes('firefox') || ua.includes('edg');
}

function allowedOriginsForRequest(request: Request): Set<string> {
  const requestOrigin = normalizeOrigin(request.url);
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || '');
  const allowed = new Set<string>();

  if (requestOrigin) allowed.add(requestOrigin);
  if (configuredOrigin) allowed.add(configuredOrigin);

  return allowed;
}

export function rejectUntrustedRequest(request: Request, routeLabel: string): Response | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const allowedOrigins = allowedOriginsForRequest(request);
  const origin = normalizeOrigin(request.headers.get('origin') || '');
  const refererOrigin = extractOriginFromReferer(request.headers.get('referer') || '');
  const fetchSite = (request.headers.get('sec-fetch-site') || '').trim().toLowerCase();
  const userAgent = (request.headers.get('user-agent') || '').trim();

  const hasTrustedOrigin = origin !== '' && allowedOrigins.has(origin);
  const hasTrustedReferer = refererOrigin !== '' && allowedOrigins.has(refererOrigin);
  const browserLike = userAgent !== '' && isBrowserLikeUserAgent(userAgent);

  if (browserLike && (hasTrustedOrigin || hasTrustedReferer)) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: `${routeLabel} only accepts same-origin browser requests`,
      },
    },
    { status: 403 },
  );
}
