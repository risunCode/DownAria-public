/**
 * Format Utilities
 * Formatting functions + URL utilities
 */

import { PlatformId } from '@/modules/media';

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

const DOMAIN_PLATFORM_MAP: Record<string, PlatformId> = {
  'facebook.com': 'facebook',
  'www.facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'web.facebook.com': 'facebook',
  'fb.watch': 'facebook',
  'fb.gg': 'facebook',
  'fb.me': 'facebook',
  'l.facebook.com': 'facebook',
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'music.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
  'instagr.am': 'instagram',
  'tiktok.com': 'tiktok',
  'www.tiktok.com': 'tiktok',
  'vt.tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'x.com': 'twitter',
  'www.x.com': 'twitter',
  'twitter.com': 'twitter',
  'www.twitter.com': 'twitter',
  'pixiv.net': 'pixiv',
  'www.pixiv.net': 'pixiv',
};

export function sanitizeUrl(value: string): string {
  return value.trim();
}

export function validatePublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function platformDetect(value: string): PlatformId | null {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return DOMAIN_PLATFORM_MAP[hostname] || null;
  } catch {
    return null;
  }
}
