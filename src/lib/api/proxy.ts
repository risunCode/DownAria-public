/**
 * Proxy URL Helper
 * Builds proxy URLs via frontend BFF routes
 */
import type { PlatformId } from '@/lib/types';

export function getProxyUrl(url: string, options?: {
    filename?: string;
    platform?: string;
    head?: boolean;
    download?: boolean;
    accessToken?: string;
}): string {
    const params = new URLSearchParams();
    params.set('url', url);

    if (options?.filename) params.set('filename', options.filename);
    if (options?.platform) params.set('platform', options.platform);
    if (options?.head) params.set('head', '1');
    if (options?.download) params.set('download', '1');
    if (options?.accessToken) params.set('access_token', options.accessToken);

    return `/api/web/proxy?${params.toString()}`;
}

export function getDownloadUrl(url: string, options?: {
    filename?: string;
    platform?: string;
    accessToken?: string;
}): string {
    const params = new URLSearchParams();
    params.set('url', url);

    if (options?.filename) params.set('filename', options.filename);
    if (options?.platform) params.set('platform', options.platform);
    if (options?.accessToken) params.set('access_token', options.accessToken);

    return `/api/web/download?${params.toString()}`;
}

export async function issueWebAccessToken(options: {
    action: 'download' | 'proxy';
    url: string;
    filename?: string;
    platform?: string;
}): Promise<string> {
    const response = await fetch('/api/web/access-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
    });

    if (!response.ok) {
        throw new Error(`Failed to issue ${options.action} access token`);
    }

    const payload = await response.json() as { data?: { token?: string } };
    const token = payload.data?.token?.trim();
    if (!token) {
        throw new Error(`Missing ${options.action} access token`);
    }

    return token;
}

export async function getProtectedProxyUrl(url: string, options?: {
    filename?: string;
    platform?: string;
    head?: boolean;
    download?: boolean;
}): Promise<string> {
    const accessToken = await issueWebAccessToken({
        action: 'proxy',
        url,
        platform: options?.platform,
    });

    return getProxyUrl(url, { ...options, accessToken });
}

export async function getProtectedDownloadUrl(url: string, options?: {
    filename?: string;
    platform?: string;
}): Promise<string> {
    const accessToken = await issueWebAccessToken({
        action: 'download',
        url,
        filename: options?.filename,
        platform: options?.platform,
    });

    return getDownloadUrl(url, { ...options, accessToken });
}

/**
 * Get proxied thumbnail URL - ALL thumbnails go through proxy
 * This ensures consistent loading across all platforms
 */
export function getProxiedThumbnail(url: string | undefined, platform?: PlatformId | string): string {
    if (!url) return '';
    
    // All thumbnails go through proxy for consistent loading
    return getProxyUrl(url, { platform: platform as string });
}
