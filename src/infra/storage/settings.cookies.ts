import { clearAllCookies as clearEncryptedCookies, getEncryptedCookies, setEncryptedCookies } from './crypto';
import { type CookiePlatform } from './settings.model';

export function getPlatformCookie(platform: CookiePlatform): string | null {
  if (typeof window === 'undefined') return null;
  const cookies = getEncryptedCookies();
  return cookies[platform] || null;
}

export function savePlatformCookie(platform: CookiePlatform, cookie: string): void {
  if (typeof window === 'undefined') return;
  const cookies = getEncryptedCookies();
  cookies[platform] = cookie.trim();
  setEncryptedCookies(cookies);
}

export function clearPlatformCookie(platform: CookiePlatform): void {
  if (typeof window === 'undefined') return;
  const cookies = getEncryptedCookies();
  delete cookies[platform];
  setEncryptedCookies(cookies);
}

export function hasPlatformCookie(platform: CookiePlatform): boolean {
  return getPlatformCookie(platform) !== null;
}

export function getAllCookieStatus(): Record<CookiePlatform, boolean> {
  return {
    facebook: hasPlatformCookie('facebook'),
    instagram: hasPlatformCookie('instagram'),
    twitter: hasPlatformCookie('twitter'),
    youtube: hasPlatformCookie('youtube'),
  };
}

export function clearAllCookies(): void {
  if (typeof window === 'undefined') return;
  clearEncryptedCookies();
}
