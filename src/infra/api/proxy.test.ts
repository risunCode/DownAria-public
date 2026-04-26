import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isBackendExtractData } from './types';
import { proxyDownload, proxyJson, readClientJson } from './proxy';
import { buildBackendUrl } from './backend';

vi.mock('./backend', () => ({
  buildBackendUrl: vi.fn((path: string) => `http://backend${path}`),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('api proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns a structured 400 for malformed client json', async () => {
    const request = new Request('http://localhost:3000/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"bad json"',
    });

    const parsed = await readClientJson(request);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(400);
    }
  });

  it('returns 413 before parsing oversized client json', async () => {
    const body = 'x'.repeat(1024 * 1024 + 1);
    const request = new Request('http://localhost:3000/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length.toString() },
      body,
    });

    const parsed = await readClientJson(request);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(413);
    }
  });

  it('returns 413 when streamed client json exceeds the body limit without content-length', async () => {
    const body = 'x'.repeat(1024 * 1024 + 1);
    const request = new Request('http://localhost:3000/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const parsed = await readClientJson(request);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(413);
    }
  });

  it('passes through upstream 401 without auth retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      success: false,
      response_time_ms: 1,
      error: { message: 'invalid token' },
    }, 401)));

    const response = await proxyJson({
      method: 'GET',
      path: '/api/v1/jobs/job_123',
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });

  it('returns a 502 for non-json upstream responses on json routes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', {
      status: 502,
      headers: {
        'Content-Type': 'text/html',
      },
    })));

    const response = await proxyJson({
      method: 'GET',
      path: '/api/v1/jobs/job_123',
    });
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error.code).toBe('upstream_invalid_response');
  });

  it('passes through async download envelopes', async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      response_time_ms: 1,
      data: {
        mode: 'async',
        job: { 
          id: 'job_123', 
          type: 'download',
          state: 'pending',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          status_url: 'http://backend/api/v1/jobs/job_123',
          artifact_url: 'http://backend/api/v1/jobs/job_123/artifact',
        },
      },
    }, 202));
    vi.stubGlobal('fetch', mockFetch);

    const response = await proxyDownload({
      method: 'POST',
      path: '/api/v1/download',
      body: { url: 'https://example.com/video.mp4' },
    });
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.success).toBe(true);
    expect(payload.data.mode).toBe('async');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://backend/api/v1/download',
      expect.objectContaining({
        method: 'POST',
        body: '{"url":"https://example.com/video.mp4"}',
      })
    );
  });
});