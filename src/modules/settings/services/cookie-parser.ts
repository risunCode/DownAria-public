import type { CookiePlatform } from '@/infra/storage';

export interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
}

const COOKIE_TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function isCookieToken(value: string): boolean {
  return COOKIE_TOKEN_RE.test(value);
}

function stripCookieHeaderPrefix(value: string): string {
  return value.replace(/^cookie\s*:\s*/i, '').trim();
}

function isPotentialNetscapeCookieRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('#') && !trimmed.startsWith('#HttpOnly_')) {
    return false;
  }

  const parts = trimmed.split('	');
  return parts.length >= 7;
}

function getCaseInsensitiveValue(source: Record<string, unknown>, keys: string[]): unknown {
  const lowerKeySet = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(source)) {
    if (lowerKeySet.has(key.toLowerCase())) {
      return value;
    }
  }
  return undefined;
}

function parseCookieLikeObject(cookieLike: unknown): ParsedCookie | null {
  if (!cookieLike || typeof cookieLike !== 'object' || Array.isArray(cookieLike)) return null;
  const source = cookieLike as Record<string, unknown>;

  const rawName = getCaseInsensitiveValue(source, ['name', 'cookieName', 'key']);
  const rawValue = getCaseInsensitiveValue(source, ['value', 'cookieValue', 'content']);
  const rawDomain = getCaseInsensitiveValue(source, ['domain', 'host', 'hostKey']);

  const name = typeof rawName === 'string' ? rawName.trim() : String(rawName ?? '').trim();
  const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue ?? '').trim();
  const domain = typeof rawDomain === 'string' ? rawDomain.trim() : String(rawDomain ?? '').trim();

  if (!name || !value || !isCookieToken(name)) return null;
  return domain ? { name, value, domain } : { name, value };
}

function getNestedCookiesArrays(node: unknown): unknown[][] {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];

  const nested: unknown[][] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.toLowerCase() === 'cookies' && Array.isArray(value)) {
      nested.push(value);
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      nested.push(...getNestedCookiesArrays(value));
    }
  }
  return nested;
}

function parseJsonCookies(text: string): ParsedCookie[] {
  const parsed = JSON.parse(text);
  const cookies: ParsedCookie[] = [];

  const pushCookie = (item: unknown) => {
    const cookie = parseCookieLikeObject(item);
    if (cookie) cookies.push(cookie);
  };

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      pushCookie(item);
    }
    return cookies;
  }

  if (!parsed || typeof parsed !== 'object') {
    return cookies;
  }

  for (const cookieArray of getNestedCookiesArrays(parsed)) {
    for (const cookie of cookieArray) {
      pushCookie(cookie);
    }
  }

  const singleCookie = parseCookieLikeObject(parsed);
  if (singleCookie) {
    cookies.push(singleCookie);
  }

  if (cookies.length > 0) {
    return cookies;
  }

  for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
    const normalizedName = String(name).trim();
    const normalizedValue = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    if (!normalizedName || !normalizedValue || !isCookieToken(normalizedName)) continue;
    cookies.push({ name: normalizedName, value: normalizedValue });
  }

  return cookies;
}

function parseNetscapeCookies(text: string): ParsedCookie[] {
  const cookies: ParsedCookie[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#') && !trimmed.startsWith('#HttpOnly_')) continue;

    let parts = trimmed.split('	');
    if (parts.length < 7) {
      parts = trimmed.split(/\s+/);
    }
    if (parts.length < 7) continue;

    const rawDomain = parts[0]?.trim() ?? '';
    const domain = rawDomain.startsWith('#HttpOnly_') ? rawDomain.slice('#HttpOnly_'.length).trim() : rawDomain;
    const name = parts[5]?.trim() ?? '';
    const value = parts.slice(6).join('	').trim();

    if (!name || !value || !isCookieToken(name)) continue;
    cookies.push(domain ? { name, value, domain } : { name, value });
  }

  return cookies;
}

function detectCookieFormat(text: string): 'json' | 'netscape' | 'flat' {
  const trimmed = text.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      return 'flat';
    }
  }

  if (/^#\s*Netscape\s+HTTP\s+Cookie\s+File/im.test(trimmed)) {
    return 'netscape';
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines.some((line) => isPotentialNetscapeCookieRow(line))) {
    return 'netscape';
  }

  return 'flat';
}

function convertToFlatFormat(cookies: ParsedCookie[]): string {
  return cookies
    .map((cookie) => ({ name: cookie.name.trim(), value: cookie.value.trim() }))
    .filter((cookie) => cookie.name && cookie.value && isCookieToken(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

export function normalizeFlatCookieString(flatCookie: string): string {
  const normalized = stripCookieHeaderPrefix(flatCookie);
  const cookies: ParsedCookie[] = [];

  for (const chunk of normalized.split(/[;\r\n]+/)) {
    const pair = chunk.trim();
    if (!pair) continue;

    const separatorIndex = pair.indexOf('=');
    if (separatorIndex < 1) continue;

    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name || !value || !isCookieToken(name)) continue;

    cookies.push({ name, value });
  }

  return convertToFlatFormat(cookies);
}

export function parseCookieInputToFlat(input: string, _platform: CookiePlatform): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('No valid cookies found');
  }

  const format = detectCookieFormat(trimmed);

  if (format === 'flat') {
    if (!trimmed.includes('=')) {
      throw new Error('Invalid cookie format');
    }
    const flat = normalizeFlatCookieString(trimmed);
    if (!flat) {
      throw new Error('No valid cookies found');
    }
    return flat;
  }

  const parsedCookies = format === 'json' ? parseJsonCookies(trimmed) : parseNetscapeCookies(trimmed);
  if (parsedCookies.length === 0) {
    throw new Error('No valid cookies found');
  }

  const flatCookie = convertToFlatFormat(parsedCookies);
  if (!flatCookie) {
    throw new Error('No valid cookies found');
  }

  return flatCookie;
}
