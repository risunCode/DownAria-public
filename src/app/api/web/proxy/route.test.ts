import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const originalEnv = { ...process.env };

describe('/api/web/proxy route', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.example.com';
    process.env.WEB_INTERNAL_SHARED_SECRET = 'test-shared-secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('forwards client Range header to upstream fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('partial-bytes', {
        status: 206,
        headers: {
          'content-type': 'video/mp4',
          'content-range': 'bytes 0-9/100',
          'x-file-size': '100',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock as typeof fetch);

    const request = new Request('https://app.example.com/api/web/proxy?url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4', {
      headers: {
        range: 'bytes=0-9',
      },
    });

    await GET(request);

    const [upstreamUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(upstreamUrl).toBe('https://backend.example.com/api/web/proxy?url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4');
    expect(init.headers).toMatchObject({
      Range: 'bytes=0-9',
      Origin: 'https://app.example.com',
    });
  });

  it('returns content-range and x-file-size headers for head=1 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 206,
        headers: {
          'content-type': 'video/mp4',
          'content-range': 'bytes 0-0/987654',
          'x-file-size': '987654',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock as typeof fetch);

    const response = await GET(
      new Request('https://app.example.com/api/web/proxy?url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4&head=1'),
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 0-0/987654');
    expect(response.headers.get('x-file-size')).toBe('987654');
  });

  it('keeps HLS rewrite behavior unchanged', async () => {
    const body = ['#EXTM3U', '#EXT-X-STREAM-INF:BANDWIDTH=800000', 'low/index.m3u8', '#EXT-X-KEY:METHOD=AES-128,URI="key.key"', 'segment.ts'].join(
      '\n',
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: {
          'content-type': 'application/vnd.apple.mpegurl',
          'content-length': '123',
          'x-file-size': '555',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock as typeof fetch);

    const response = await GET(
      new Request(
        'https://app.example.com/api/web/proxy?url=https%3A%2F%2Fcdn.example.com%2Fmaster.m3u8&platform=youtube',
      ),
    );
    const rewritten = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/vnd.apple.mpegurl; charset=utf-8');
    expect(response.headers.get('content-length')).toBeNull();
    expect(rewritten).toContain(
      '/api/web/proxy?url=https%3A%2F%2Fcdn.example.com%2Flow%2Findex.m3u8&inline=1&hls=1&platform=youtube',
    );
    expect(rewritten).toContain(
      'URI="/api/web/proxy?url=https%3A%2F%2Fcdn.example.com%2Fkey.key&inline=1&hls=1&platform=youtube"',
    );
    expect(rewritten).toContain(
      '/api/web/proxy?url=https%3A%2F%2Fcdn.example.com%2Fsegment.ts&inline=1&hls=1&platform=youtube',
    );
  });
});
