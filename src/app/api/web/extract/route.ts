import { NextResponse } from 'next/server';
import { buildWebSignatureHeaders, resolveGatewayOrigin } from '../_internal/signature';

type ExtractPayload = {
  url?: string;
  cookie?: string;
};

export async function POST(request: Request) {
  const backendBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  const sharedSecret = (process.env.WEB_INTERNAL_SHARED_SECRET || '').trim();
  const origin = resolveGatewayOrigin(request);

  if (!backendBase || !sharedSecret || !origin) {
    return NextResponse.json(
      { success: false, error: { code: 'ACCESS_DENIED', message: 'web extract gateway is not configured' } },
      { status: 503 },
    );
  }

  let payload: ExtractPayload;
  try {
    payload = (await request.json()) as ExtractPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_JSON', message: 'request body must be valid JSON' } },
      { status: 400 },
    );
  }

  const body = JSON.stringify({
    url: typeof payload.url === 'string' ? payload.url : '',
    cookie: typeof payload.cookie === 'string' ? payload.cookie : '',
  });

  const path = '/api/web/extract';
  const signatureHeaders = buildWebSignatureHeaders(sharedSecret, 'POST', path, body);

  try {
    const res = await fetch(`${backendBase}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        Origin: origin,
        ...signatureHeaders,
      },
      body,
      signal: request.signal,
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({ success: false, error: { code: 'UPSTREAM_ERROR', message: 'invalid upstream response' } }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_ERROR', message: 'failed to reach backend extract service' } },
      { status: 502 },
    );
  }
}
