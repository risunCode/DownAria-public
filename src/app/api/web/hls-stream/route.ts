import { NextResponse } from 'next/server';

/**
 * HLS Stream Handler - No signature required for player compatibility
 * Forwards HLS playlist/segment requests directly to backend
 */
export async function GET(request: Request) {
  const backendBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();

  if (!backendBase) {
    return NextResponse.json(
      { success: false, error: { code: 'ACCESS_DENIED', message: 'backend API URL is not configured' } },
      { status: 503 },
    );
  }

  const inputUrl = new URL(request.url);
  const query = inputUrl.searchParams.toString();

  // Forward to backend /api/v1/hls-stream (public, no signature)
  const upstreamUrl = `${backendBase}/api/v1/hls-stream${query ? `?${query}` : ''}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: request.signal,
      cache: 'no-store',
    });

    const headers = new Headers();
    const passHeaders = [
      'content-type',
      'content-length',
      'cache-control',
      'access-control-allow-origin',
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
      { success: false, error: { code: 'UPSTREAM_ERROR', message: 'failed to reach backend HLS stream service' } },
      { status: 502 },
    );
  }
}
