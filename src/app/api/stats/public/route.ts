import { NextResponse } from 'next/server';

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export async function GET(request: Request) {
  const backendBase = normalizeUrl(process.env.NEXT_PUBLIC_API_URL || '');

  if (!backendBase) {
    return NextResponse.json(
      { success: false, error: { code: 'ACCESS_DENIED', message: 'public stats gateway is not configured' } },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetch(`${backendBase}/api/v1/stats/public`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: request.signal,
      cache: 'no-store',
    });

    const payload = await upstream.json().catch(() => null);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'UPSTREAM_ERROR', message: 'invalid upstream response' } },
        { status: 502 },
      );
    }

    return NextResponse.json(payload, {
      status: upstream.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_ERROR', message: 'failed to reach backend public stats service' } },
      { status: 502 },
    );
  }
}
