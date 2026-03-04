import { NextResponse } from 'next/server';
import { buildWebSignatureHeaders, resolveGatewayOrigin } from '../_internal/signature';

function buildLocalProxyURL(target: string, platform?: string): string {
  const params = new URLSearchParams();
  params.set('url', target);
  params.set('inline', '1');
  params.set('hls', '1');
  if (platform) params.set('platform', platform);
  return `/api/web/proxy?${params.toString()}`;
}

function toAbsoluteURL(candidate: string, base: string): string {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return candidate;
  }
}

function rewriteM3U8Body(body: string, sourceURL: string, platform?: string): string {
  const lines = body.split(/\r?\n/);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        if (!trimmed.includes('URI="')) return line;
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
          const absolute = toAbsoluteURL(uri, sourceURL);
          return `URI="${buildLocalProxyURL(absolute, platform)}"`;
        });
      }

      const absolute = toAbsoluteURL(trimmed, sourceURL);
      return buildLocalProxyURL(absolute, platform);
    })
    .join('\n');
}

export async function GET(request: Request) {
  const backendBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  const sharedSecret = (process.env.WEB_INTERNAL_SHARED_SECRET || '').trim();
  const origin = resolveGatewayOrigin(request);

  if (!backendBase || !sharedSecret || !origin) {
    return NextResponse.json(
      { success: false, error: { code: 'ACCESS_DENIED', message: 'web proxy gateway is not configured' } },
      { status: 503 },
    );
  }

  const inputUrl = new URL(request.url);
  const path = '/api/web/proxy';
  const query = inputUrl.searchParams.toString();
  const upstreamUrl = `${backendBase}${path}${query ? `?${query}` : ''}`;
  const signatureHeaders = buildWebSignatureHeaders(sharedSecret, 'GET', path, '');
  const rangeHeader = request.headers.get('range');

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        Origin: origin,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
        ...signatureHeaders,
      },
      signal: request.signal,
      cache: 'no-store',
    });

    const headers = new Headers();
    const passHeaders = [
      'content-type',
      'content-length',
      'content-disposition',
      'cache-control',
      'etag',
      'last-modified',
      'accept-ranges',
      'content-range',
      'x-file-size',
    ];

    for (const key of passHeaders) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const sourceURL = inputUrl.searchParams.get('url') || '';
    const platform = inputUrl.searchParams.get('platform') || undefined;

    if (sourceURL && (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl'))) {
      const text = await upstream.text();
      const rewritten = rewriteM3U8Body(text, sourceURL, platform);
      headers.delete('content-length');
      headers.set('content-type', 'application/vnd.apple.mpegurl; charset=utf-8');
      return new Response(rewritten, {
        status: upstream.status,
        headers,
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_ERROR', message: 'failed to reach backend proxy service' } },
      { status: 502 },
    );
  }
}
