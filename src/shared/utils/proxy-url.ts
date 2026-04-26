import { toSafeExternalHttpUrl } from '@/shared/security/urls';

/**
 * Resolves a safe external URL to a Backend backend proxy URL.
 * This is used for media playback (video/audio) and thumbnails to avoid IP-binding issues
 * and ensure that the backend IP is used for streaming.
 */
export function resolveBackendProxyUrl(value?: string): string | null {
  if (!value) return null;
  const safeUrl = toSafeExternalHttpUrl(value);
  if (!safeUrl) return null;

  return `/api/proxy?url=${encodeURIComponent(safeUrl)}`;
}
