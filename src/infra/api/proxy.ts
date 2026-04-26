import { NextResponse } from 'next/server';

import { buildBackendUrl } from '@/infra/api/backend';
import { isBackendAsyncDownloadData, isBackendResponse } from '@/infra/api/types';
import { CircuitBreakerOpenError, circuitBreaker } from '@/shared/utils/circuit-breaker';
import { createTimeoutSignal } from '@/shared/utils/fetch-timeout';

export interface ProxyJsonOptions<T = unknown> {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: unknown;
  validateData?: (value: unknown) => value is T;
}

const MAX_CLIENT_BODY_BYTES = 1 * 1024 * 1024;

class RetryableUpstreamStatusError extends Error {
  response: Response;

  constructor(response: Response) {
    super(`Retryable upstream failure status: ${response.status}`);
    this.name = 'RetryableUpstreamStatusError';
    this.response = response;
  }
}

function shouldCountAsBreakerFailure(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function readLimitedText(req: Request, maxBytes: number): Promise<{ ok: true; text: string } | { ok: false; tooLarge: boolean }> {
  if (!req.body) {
    return { ok: true, text: '' };
  }

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      return { ok: false, tooLarge: true };
    }
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return { ok: true, text };
}

export async function readClientJson(req: Request): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  const contentLength = req.headers.get('content-length');
  if (contentLength !== null && Number.parseInt(contentLength, 10) > MAX_CLIENT_BODY_BYTES) {
    return {
      ok: false,
      response: createProxyErrorResponse(413, 'request_too_large', 'Request body too large.'),
    };
  }

  const rawBody = await readLimitedText(req, MAX_CLIENT_BODY_BYTES);
  if (!rawBody.ok) {
    return {
      ok: false,
      response: createProxyErrorResponse(413, 'request_too_large', 'Request body too large.'),
    };
  }

  try {
    return {
      ok: true,
      data: JSON.parse(rawBody.text),
    };
  } catch {
    return {
      ok: false,
      response: createProxyErrorResponse(400, 'invalid_request_body', 'Invalid request body.'),
    };
  }
}

/**
 * Performs a request to the Backend backend.
 * keepalive: true enables HTTP keep-alive so the TCP connection is reused across requests,
 * reducing latency. Browsers cap connections at 6 per origin (HTTP/1.1) or multiplex (HTTP/2).
 */
async function performRequest(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<Response> {
  const headers = new Headers();
  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    keepalive: true,
    signal: createTimeoutSignal(),
  };

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(body);
  }

  try {
    const response = await circuitBreaker.execute(normalizeBreakerKey(path), async () => {
      return fetch(buildBackendUrl(path), init);
    });
    if (shouldCountAsBreakerFailure(response.status)) {
      throw new RetryableUpstreamStatusError(response);
    }
    return response;
  } catch (error) {
    if (error instanceof RetryableUpstreamStatusError) {
      return error.response;
    }
    throw error;
  }
}

function normalizeBreakerKey(path: string): string {
  if (path.startsWith('/api/v1/jobs/')) {
    return '/api/v1/jobs/*';
  }
  if (path.startsWith('/api/v1/proxy')) {
    return '/api/v1/proxy';
  }
  const match = path.match(/^\/api\/v1\/[a-z-]+/i);
  return match?.[0] || path;
}

async function readUpstreamJson<T>(response: Response, validateData?: (value: unknown) => value is T): Promise<{ ok: true; payload: unknown } | { ok: false; response: NextResponse }> {
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    return {
      ok: false,
      response: createProxyErrorResponse(502, 'upstream_invalid_response', 'Backend returned a non-JSON response for a JSON endpoint.'),
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      response: createProxyErrorResponse(502, 'upstream_invalid_json', 'Backend returned malformed JSON.'),
    };
  }

  if (!isBackendResponse(payload)) {
    return {
      ok: false,
      response: createProxyErrorResponse(502, 'upstream_invalid_envelope', 'Backend returned an invalid response envelope.'),
    };
  }

  if (payload.success && validateData && !validateData(payload.data)) {
    return {
      ok: false,
      response: createProxyErrorResponse(502, 'upstream_invalid_data', 'Backend returned an unexpected response payload.'),
    };
  }

  return {
    ok: true,
    payload,
  };
}

function copyResponseHeader(source: Response, target: Headers, name: string): void {
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
        kind: 'proxy',
        code,
        message,
      },
    },
    { status }
  );
}

function mapProxyFailure(error: unknown): NextResponse {
  if (error instanceof CircuitBreakerOpenError) {
    return createProxyErrorResponse(503, 'circuit_breaker_open', error.message);
  }

  return createProxyErrorResponse(502, 'upstream_unavailable', 'Backend is unavailable right now.');
}

export async function proxyJson<T>(options: ProxyJsonOptions<T>): Promise<NextResponse> {
  try {
    const response = await performRequest(options.method, options.path, options.body);

    const parsed = await readUpstreamJson(response, options.validateData);
    if (!parsed.ok) {
      return parsed.response;
    }

    return NextResponse.json(parsed.payload, { status: response.status });
  } catch (error) {
    return mapProxyFailure(error);
  }
}

export async function proxyDownload(options: ProxyJsonOptions): Promise<NextResponse> {
  try {
    const response = await performRequest(options.method, options.path, options.body);

    if (response.status === 200) {
      const headers = new Headers();
      copyResponseHeader(response, headers, 'Content-Type');
      copyResponseHeader(response, headers, 'Content-Disposition');
      copyResponseHeader(response, headers, 'Content-Length');
      copyResponseHeader(response, headers, 'Content-Range');
      copyResponseHeader(response, headers, 'Accept-Ranges');
      copyResponseHeader(response, headers, 'ETag');
      copyResponseHeader(response, headers, 'Last-Modified');
      copyResponseHeader(response, headers, 'X-DownAria-API-Mode');
      copyResponseHeader(response, headers, 'X-DownAria-API-Downloader');
      return new NextResponse(response.body, {
        status: response.status,
        headers,
      });
    }

    const parsed = await readUpstreamJson(response, response.status === 202 ? isBackendAsyncDownloadData : undefined);
    if (!parsed.ok) {
      return parsed.response;
    }

    return NextResponse.json(parsed.payload, { status: response.status });
  } catch (error) {
    return mapProxyFailure(error);
  }
}
