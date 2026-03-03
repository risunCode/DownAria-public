/**
 * Proxy URL Helper
 * Builds proxy URLs via frontend BFF routes
 */
import type { PlatformId } from '@/lib/types';
import { API_URL } from '@/lib/config';

function requireApiUrl(): string {
    if (!API_URL) {
        throw new Error('NEXT_PUBLIC_API_URL is not configured');
    }
    return API_URL;
}

export function getProxyUrl(url: string, options?: {
    filename?: string;
    platform?: string;
    inline?: boolean;
    head?: boolean;
    hls?: boolean;
    download?: boolean;
}): string {
    const params = new URLSearchParams();
    params.set('url', url);
    
    if (options?.filename) params.set('filename', options.filename);
    if (options?.platform) params.set('platform', options.platform);
    if (options?.inline) params.set('inline', '1');
    if (options?.head) params.set('head', '1');
    if (options?.hls) params.set('hls', '1');
    if (options?.download) params.set('download', '1');

    return `${requireApiUrl()}/api/web/proxy?${params.toString()}`;
}

/**
 * Get proxied thumbnail URL - ALL thumbnails go through proxy
 * This ensures consistent loading across all platforms
 */
export function getProxiedThumbnail(url: string | undefined, platform?: PlatformId | string): string {
    if (!url) return '';
    
    // All thumbnails go through proxy for consistent loading
    return getProxyUrl(url, { platform: platform as string, inline: true });
}
