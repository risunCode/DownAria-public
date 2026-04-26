import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function buildCsp(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
      'https://va.vercel-scripts.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http://localhost:*', 'http://127.0.0.1:*'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      ...(isDevelopment ? ['ws://localhost:*', 'ws://127.0.0.1:*'] : []),
      'http://localhost:*',
      'http://127.0.0.1:*',
      'https://*.railway.app',
      'https://*.vercel.app',
      'https://va.vercel-scripts.com',
      'https://discord.com',
    ],
    'media-src': ["'self'", 'blob:', 'https:', 'http://localhost:*', 'http://127.0.0.1:*'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

function createNonce(): string {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return btoa(String.fromCharCode(...values));
}

export default function proxy(request: NextRequest) {
  const nonce = createNonce();
  const cspHeader = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml, robots.txt (SEO files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
