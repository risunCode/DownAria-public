import { NextResponse } from 'next/server';
import { ensureWebSessionCookie, buildWebAccessToken, type WebAccessAction } from '../../_internal/access-session';
import { rejectUntrustedRequest } from '../../_internal/request-guard';

type AccessTokenPayload = {
  action?: WebAccessAction;
  url?: string;
  filename?: string;
  platform?: string;
};

export async function POST(request: Request) {
  const rejected = rejectUntrustedRequest(request, 'web access token gateway');
  if (rejected) return rejected;

  let payload: AccessTokenPayload;
  try {
    payload = (await request.json()) as AccessTokenPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_JSON', message: 'request body must be valid JSON' } },
      { status: 400 },
    );
  }

  const action = payload.action;
  const url = typeof payload.url === 'string' ? payload.url.trim() : '';
  const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
  const platform = typeof payload.platform === 'string' ? payload.platform.trim() : '';

  if ((action !== 'download' && action !== 'proxy') || !url) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: 'action and url are required' } },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ success: true, data: { token: '', expiresAt: 0 } });
  const session = ensureWebSessionCookie(response, request);
  const { token, expiresAt } = buildWebAccessToken({ session, action, url, filename, platform });

  response.headers.set('content-type', 'application/json');
  response.headers.delete('content-length');
  return new NextResponse(JSON.stringify({ success: true, data: { token, expiresAt } }), {
    status: 200,
    headers: response.headers,
  });
}
