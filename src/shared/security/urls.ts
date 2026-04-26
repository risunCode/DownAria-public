function stripInvisibleCharacters(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export function normalizePastedText(value: string): string {
  return stripInvisibleCharacters(value)
    .replace(/\r\n/g, '\n')
    .replace(/[\t\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePossibleExternalUrl(value: string): string {
  const normalized = normalizePastedText(value);
  if (!normalized) return '';

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(?:\/|\?|$)/i.test(normalized)) {
    return `https://${normalized.replace(/^\/+/, '')}`;
  }

  return normalized;
}

function isBlockedMirrorWorkerHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.+$/, '');
  return normalized === 'workers.dev' || normalized.endsWith('.workers.dev');
}

export function toSafeExternalHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(normalizePossibleExternalUrl(value));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (isBlockedMirrorWorkerHost(parsed.hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractFirstExternalHttpUrl(value: string): string {
  const normalized = normalizePastedText(value);
  const match = normalized.match(/(?:https?:\/\/|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/)[^\s]*/i);
  if (!match) return '';

  return toSafeExternalHttpUrl(match[0]) || '';
}
