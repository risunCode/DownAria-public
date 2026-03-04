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
}): string {
    const params = new URLSearchParams();
    params.set('url', url);

    if (options?.filename) params.set('filename', options.filename);
    if (options?.platform) params.set('platform', options.platform);
    if (options?.head) params.set('head', '1');
    if (options?.download) params.set('download', '1');

    // Auto-detect HLS URLs and route to hls-stream endpoint
    const isHlsUrl = url.toLowerCase().includes('.m3u8');
    const endpoint = isHlsUrl ? '/api/web/hls-stream' : '/api/web/proxy';

    return `${endpoint}?${params.toString()}`;
}

export function getDownloadUrl(url: string, options?: {
    filename?: string;
    platform?: string;
}): string {
    const params = new URLSearchParams();
    params.set('url', url);

    if (options?.filename) params.set('filename', options.filename);
    if (options?.platform) params.set('platform', options.platform);

    return `/api/web/download?${params.toString()}`;
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
