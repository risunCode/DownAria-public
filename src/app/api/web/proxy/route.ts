import { NextResponse } from 'next/server';
import { buildWebSignatureHeaders, resolveGatewayOrigin } from '../_internal/signature';

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

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        Origin: origin,
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
    ];

    for (const key of passHeaders) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
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
