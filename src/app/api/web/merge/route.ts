import { NextResponse } from 'next/server';
import { buildWebSignatureHeaders, resolveGatewayOrigin } from '../_internal/signature';

export async function POST(request: Request) {
  const backendBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  const sharedSecret = (process.env.WEB_INTERNAL_SHARED_SECRET || '').trim();
  const origin = resolveGatewayOrigin(request);

  if (!backendBase || !sharedSecret || !origin) {
    return NextResponse.json(
      { success: false, error: { code: 'ACCESS_DENIED', message: 'web merge gateway is not configured' } },
      { status: 503 },
    );
  }

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_JSON', message: 'request body must be valid JSON' } },
      { status: 400 },
    );
  }

  if (!rawBody.trim()) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_JSON', message: 'request body must not be empty' } },
      { status: 400 },
    );
  }

  const path = '/api/web/merge';
  const signatureHeaders = buildWebSignatureHeaders(sharedSecret, 'POST', path, rawBody);

  try {
    const upstream = await fetch(`${backendBase}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        Origin: origin,
        ...signatureHeaders,
      },
      body: rawBody,
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
      { success: false, error: { code: 'UPSTREAM_ERROR', message: 'failed to reach backend merge service' } },
      { status: 502 },
    );
  }
}
