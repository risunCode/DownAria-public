import { type NextRequest, NextResponse } from 'next/server';

import { buildBackendUrl } from '@/infra/api/backend';
import { toSafeExternalHttpUrl } from '@/shared/security/urls';
import { createTimeoutSignal } from '@/shared/utils/fetch-timeout';

function copyHeader(source: Response, target: Headers, name: string) {
  const value = source.headers.get(name);
  if (value) {
    target.set(name, value);
  }
}

function createProxyErrorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      response_time_ms: 0,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

async function readUpstreamErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      const payload = await response.json() as { error?: { message?: string } };
      const message = payload?.error?.message?.trim();
      if (message) {
        return message;
      }
    } catch {
      // Fall through to text parser.
    }
  }

  const text = (await response.text()).trim();
  if (!text) {
    return 'Upstream media proxy returned an error response.';
  }
  return text.slice(0, 500);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rawUrl = req.nextUrl.searchParams.get('url') || '';
  const safeUrl = toSafeExternalHttpUrl(rawUrl);
  if (!safeUrl) {
    return NextResponse.json(
      {
        success: false,
        response_time_ms: 0,
        error: {
          code: 'proxy_url_required',
          message: 'A valid url query parameter is required.',
        },
      },
      { status: 400 }
    );
  }

  const requestHeaders = new Headers();
  requestHeaders.set('Accept', req.headers.get('Accept') || '*/*');
  const range = req.headers.get('Range');
  if (range && range.trim().length > 0) {
    requestHeaders.set('Range', range);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${buildBackendUrl('/api/v1/proxy')}?url=${encodeURIComponent(safeUrl)}`, {
      method: 'GET',
      headers: requestHeaders,
      cache: 'no-store',
      signal: createTimeoutSignal(),
    });
  } catch {
    return createProxyErrorResponse(502, 'proxy_upstream_unavailable', 'Unable to reach upstream media proxy.');
  }

  const headers = new Headers();
  copyHeader(upstream, headers, 'Content-Type');
  copyHeader(upstream, headers, 'Content-Length');
  copyHeader(upstream, headers, 'Content-Range');
  copyHeader(upstream, headers, 'Accept-Ranges');
  copyHeader(upstream, headers, 'ETag');
  copyHeader(upstream, headers, 'Last-Modified');
  copyHeader(upstream, headers, 'Cache-Control');

  if (upstream.status >= 400) {
    return createProxyErrorResponse(upstream.status, 'proxy_upstream_error', await readUpstreamErrorMessage(upstream));
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
