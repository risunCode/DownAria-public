import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

const WEB_SESSION_COOKIE = 'downaria_web_session';
const WEB_SESSION_TTL_SECONDS = 20 * 60;
const WEB_ACCESS_TOKEN_TTL_SECONDS = 2 * 60;

export type WebAccessAction = 'download' | 'proxy';

type AccessTokenPayload = {
  action: WebAccessAction;
  session: string;
  url: string;
  filename?: string;
  platform?: string;
  exp: number;
};

function normalizeSessionToken(value: string | null | undefined): string {
  const trimmed = (value || '').trim();
  return /^[a-f0-9-]{36}$/i.test(trimmed) ? trimmed : '';
}

function normalizeOptional(value: string | undefined): string {
  return (value || '').trim();
}

function buildAccessSecret(): string {
  return `downaria-web-access:${(process.env.WEB_INTERNAL_SHARED_SECRET || '').trim()}`;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function buildAccessSignature(secret: string, payloadPart: string): string {
  return createHmac('sha256', secret).update(payloadPart).digest('base64url');
}

function safeEqualString(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function readWebSessionToken(request: Request): string {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)downaria_web_session=([^;]+)/);
  return normalizeSessionToken(match ? decodeURIComponent(match[1]) : '');
}

export function ensureWebSessionCookie(response: NextResponse, request: Request): string {
  const session = readWebSessionToken(request) || randomUUID();

  response.cookies.set({
    name: WEB_SESSION_COOKIE,
    value: session,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: WEB_SESSION_TTL_SECONDS,
  });

  return session;
}

export function buildWebAccessToken(input: {
  session: string;
  action: WebAccessAction;
  url: string;
  filename?: string;
  platform?: string;
  now?: number;
}): { token: string; expiresAt: number } {
  const secret = buildAccessSecret();
  const session = normalizeSessionToken(input.session);
  const url = normalizeOptional(input.url);
  if (!secret || !session || !url) {
    throw new Error('web access token is not configured');
  }

  const now = input.now || Math.floor(Date.now() / 1000);
  const expiresAt = now + WEB_ACCESS_TOKEN_TTL_SECONDS;
  const payload: AccessTokenPayload = {
    action: input.action,
    session,
    url,
    filename: normalizeOptional(input.filename) || undefined,
    platform: normalizeOptional(input.platform) || undefined,
    exp: expiresAt,
  };

  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signaturePart = buildAccessSignature(secret, payloadPart);
  return { token: `${payloadPart}.${signaturePart}`, expiresAt };
}

export function verifyWebAccessToken(input: {
  token: string;
  session: string;
  action: WebAccessAction;
  url: string;
  filename?: string;
  platform?: string;
  now?: number;
}): boolean {
  const secret = buildAccessSecret();
  const session = normalizeSessionToken(input.session);
  const url = normalizeOptional(input.url);
  const token = (input.token || '').trim();
  if (!secret || !session || !url || !token) {
    return false;
  }

  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return false;

  const expectedSignature = buildAccessSignature(secret, payloadPart);
  if (!safeEqualString(signaturePart, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payloadPart)) as AccessTokenPayload;
    const now = input.now || Math.floor(Date.now() / 1000);
    return parsed.action === input.action
      && parsed.session === session
      && parsed.url === url
      && normalizeOptional(parsed.filename) === normalizeOptional(input.filename)
      && normalizeOptional(parsed.platform) === normalizeOptional(input.platform)
      && Number.isFinite(parsed.exp)
      && parsed.exp >= now;
  } catch {
    return false;
  }
}
