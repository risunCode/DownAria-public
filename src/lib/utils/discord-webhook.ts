/**
 * Discord Webhook Utility
 * User-side webhook for download notifications
 * Settings stored in unified downaria_settings
 * 
 * Discord Webhook Limits:
 * - 30 messages/minute per channel
 * - 50 requests/second per IP
 * - 200 MiB max payload size (with files)
 * - 10 embeds per message
 * - ~8-10MB for auto-embed videos in messages
 */

import Swal from 'sweetalert2';
import { formatNumber } from './format';
import { BASE_URL, IS_DEV } from '@/lib/config';
import { getProxyUrl as buildProxyUrl } from '@/lib/api/proxy';
import { 
  getUserDiscordSettings, 
  saveUserDiscordSettings, 
  DEFAULT_DISCORD,
  type DiscordSettings 
} from '@/lib/storage/settings';

const APP_NAME = 'DownAria';
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB - Discord stops auto-embedding above this

const getAppIcon = () => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/icon.png`;
    }
    return BASE_URL ? `${BASE_URL}/icon.png` : '/icon.png';
};

// Re-export types and functions from settings for backward compatibility
export type { DiscordSettings as UserDiscordSettings };
export type DiscordSendMethod = 'smart' | 'single' | 'double';
export { getUserDiscordSettings, saveUserDiscordSettings };
export const DEFAULT_USER_DISCORD = DEFAULT_DISCORD;

// Legacy storage key export (for reference only, not used)
export const DISCORD_STORAGE_KEY = 'downaria_settings';

// Duplicate prevention
const recentMessages = new Map<string, number>(); // key -> timestamp
const MESSAGE_CACHE_TTL = 30 * 1000; // 30 seconds
const MAX_CACHE_SIZE = 100;

// Rate limit tracking with proper Discord headers
let rateLimitState = {
    remaining: 30,
    resetAt: 0,
    retryAfter: 0
};

function getMessageKey(data: { platform: string; sourceUrl?: string; mediaUrl?: string }): string {
    // Include timestamp bucket (30s intervals) to allow re-sends after TTL
    const timeBucket = Math.floor(Date.now() / MESSAGE_CACHE_TTL);
    return `${data.platform}:${data.sourceUrl || data.mediaUrl || ''}:${timeBucket}`.toLowerCase();
}

function isDuplicate(key: string): boolean {
    const timestamp = recentMessages.get(key);
    if (!timestamp) return false;
    // Check if expired
    if (Date.now() - timestamp > MESSAGE_CACHE_TTL) {
        recentMessages.delete(key);
        return false;
    }
    return true;
}

function markSent(key: string): void {
    // Cleanup old entries first if at capacity
    if (recentMessages.size >= MAX_CACHE_SIZE) {
        const now = Date.now();
        for (const [k, ts] of recentMessages.entries()) {
            if (now - ts > MESSAGE_CACHE_TTL) recentMessages.delete(k);
        }
        // If still at capacity, remove oldest
        if (recentMessages.size >= MAX_CACHE_SIZE) {
            const oldest = recentMessages.keys().next().value;
            if (oldest) recentMessages.delete(oldest);
        }
    }
    recentMessages.set(key, Date.now());
}

function getInlineProxyUrl(mediaUrl: string, platform: string): string {
    return buildProxyUrl(mediaUrl, { platform: platform.toLowerCase(), inline: true });
}

// Get file size via HEAD request through proxy (returns 0 if unknown)
async function getFileSize(url: string, platform: string): Promise<number> {
    try {
        // Always use proxy for HEAD request to avoid CORS issues
        const proxyUrl = buildProxyUrl(url, { platform: platform.toLowerCase(), head: true });
        const res = await fetch(proxyUrl);
        const size = res.headers.get('x-file-size');
        return size ? parseInt(size) : 0;
    } catch {
        return 0;
    }
}

// Check if file is large (>10MB) - for smart send method
export async function isLargeFile(url: string, platform: string): Promise<{ isLarge: boolean; size: number }> {
    const size = await getFileSize(url, platform);
    // If size unknown, assume large for Weibo (usually big files)
    const isLarge = size > LARGE_FILE_THRESHOLD || (size === 0 && platform.toLowerCase() === 'weibo');
    return { isLarge, size };
}

// Update rate limit state from response headers
function updateRateLimitFromHeaders(res: Response): void {
    const remaining = res.headers.get('X-RateLimit-Remaining');
    const resetAfter = res.headers.get('X-RateLimit-Reset-After');
    const retryAfter = res.headers.get('Retry-After');

    if (remaining !== null) {
        rateLimitState.remaining = parseInt(remaining);
    }
    if (resetAfter !== null) {
        rateLimitState.resetAt = Date.now() + parseFloat(resetAfter) * 1000;
    }
    if (retryAfter !== null) {
        rateLimitState.retryAfter = Date.now() + parseFloat(retryAfter) * 1000;
    }
}

// Check if we should wait before sending
function getRateLimitWait(): number {
    const now = Date.now();
    if (rateLimitState.retryAfter > now) {
        return rateLimitState.retryAfter - now;
    }
    if (rateLimitState.remaining <= 0 && rateLimitState.resetAt > now) {
        return rateLimitState.resetAt - now;
    }
    return 0;
}

// Send with rate limit handling
async function sendToWebhook(
    webhookUrl: string,
    options: RequestInit,
    retries = 3
): Promise<{ ok: boolean; status: number; retryAfter?: number; error?: string }> {
    // Check rate limit before sending
    const waitMs = getRateLimitWait();
    if (waitMs > 0) {
        if (IS_DEV) console.log(`[Discord] Waiting ${waitMs}ms for rate limit...`);
        await new Promise(r => setTimeout(r, waitMs));
    }

    try {
        const res = await fetch(webhookUrl, options);
        updateRateLimitFromHeaders(res);

        if (res.ok || res.status === 204) {
            return { ok: true, status: res.status };
        }

        if (res.status === 429) {
            // Rate limited
            const retryAfter = res.headers.get('Retry-After');
            const waitSec = retryAfter ? parseFloat(retryAfter) : 5;

            if (IS_DEV) console.log(`[Discord] Rate limited, retry after ${waitSec}s`);

            if (retries > 0) {
                await new Promise(r => setTimeout(r, waitSec * 1000));
                return sendToWebhook(webhookUrl, options, retries - 1);
            }

            return { ok: false, status: 429, retryAfter: waitSec };
        }

        // Other errors
        const errorText = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: errorText };
    } catch (err) {
        return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Network error' };
    }
}

// Helper to upload file to Discord (uses user's data)
async function sendFileToDiscord(
    webhookUrl: string,
    fileBlob: Blob,
    filename: string,
    payload: { content?: string; embeds?: any[]; username?: string; avatar_url?: string }
): Promise<{ ok: boolean; status: number; error?: string }> {
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(payload));
    formData.append('file0', fileBlob, filename);

    const res = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
    });

    if (res.ok || res.status === 204) {
        return { ok: true, status: res.status };
    }
    const errorText = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: errorText };
}

export async function sendDiscordNotification(data: {
    platform: string;
    title: string;
    quality: string;
    thumbnail?: string;
    mediaUrl?: string;
    mediaType?: 'video' | 'image' | 'audio';
    sourceUrl?: string;
    author?: string;
    engagement?: { likes?: number; comments?: number; shares?: number; views?: number };
    fileSize?: number; // NEW: Pass file size from download button to skip HEAD request
}, manual = false): Promise<{ sent: boolean; reason?: string; details?: string }> {
    const settings = getUserDiscordSettings();

    if (!settings?.enabled || !settings?.webhookUrl) {
        return { sent: false, reason: 'no_webhook' };
    }

    if (!manual && !settings.autoSend) {
        return { sent: false, reason: 'auto_disabled' };
    }

    // Check rate limit
    const waitMs = getRateLimitWait();
    if (waitMs > 1000) {
        const waitSec = Math.ceil(waitMs / 1000);
        return { sent: false, reason: 'rate_limited', details: `Rate limited. Try again in ${waitSec}s` };
    }

    // Check duplicate
    const messageKey = getMessageKey(data);
    if (isDuplicate(messageKey)) {
        return { sent: false, reason: 'duplicate', details: 'Already sent in the last minute' };
    }

    try {
        const appIcon = getAppIcon();
        const isWeibo = data.platform.toLowerCase() === 'weibo';

        // Build embed
        const fields: Array<{ name: string; value: string; inline: boolean }> = [];
        if (data.title) {
            fields.push({
                name: 'Caption',
                value: data.title.length > 200 ? data.title.substring(0, 200) + '...' : data.title,
                inline: false
            });
        }
        if (data.author) {
            fields.push({ name: 'Author', value: data.author, inline: true });
        }
        if (data.engagement) {
            const parts: string[] = [];
            if (data.engagement.views) parts.push(`${formatNumber(data.engagement.views)} views`);
            if (data.engagement.likes) parts.push(`${formatNumber(data.engagement.likes)} likes`);
            if (data.engagement.comments) parts.push(`${formatNumber(data.engagement.comments)} comments`);
            if (data.engagement.shares) parts.push(`${formatNumber(data.engagement.shares)} shares`);
            if (parts.length > 0) {
                fields.push({ name: 'Engagement', value: parts.join(' · '), inline: true });
            }
        }

        const embed: Record<string, unknown> = {
            author: { name: `${data.platform} Downloader` },
            color: parseInt(settings.embedColor.replace('#', ''), 16),
            fields,
            footer: { text: settings.footerText || 'via DownAria', icon_url: appIcon },
            timestamp: new Date().toISOString(),
        };

        if (data.sourceUrl) {
            embed.url = data.sourceUrl;
            embed.title = 'Open Source';
        }

        // Handle media display
        if (data.mediaType === 'image' && data.mediaUrl) {
            // Photos: Use BIG image (bottom)
            embed.image = { url: isWeibo ? getInlineProxyUrl(data.mediaUrl, data.platform) : data.mediaUrl };
        } else if (data.thumbnail) {
            // Videos/Other: Use THUMBNAIL (small, top-right)
            // This ensures we always have a visual, but avoids overriding the video player in 'link' mode.
            embed.thumbnail = { url: isWeibo ? getInlineProxyUrl(data.thumbnail!, data.platform) : data.thumbnail! };
        }

        // Canonical method: always 2-message link flow for video
        const mediaLabel = `${data.platform} ${data.quality || (data.mediaType === 'video' ? 'Video' : 'Media')}`;

        // UNIFIED CONFIRMATION DIALOG ---------------------------------------
        // If manual, show dialog for BOTH Upload and Link logic to ensure consistency.
        if (manual) {
            const result = await Swal.fire({
                title: 'Send to Discord?',
                html: `
                    <div class="text-left text-sm space-y-2 mt-4">
                        <div class="grid grid-cols-[80px_1fr] gap-2">
                            <span class="text-[var(--text-muted)]">Platform:</span>
                            <span class="font-medium text-[var(--text-primary)]">${data.platform}</span>
                            
                            <span class="text-[var(--text-muted)]">Type:</span>
                            <span class="font-medium text-[var(--text-primary)] flex items-center gap-1">
                                ${data.mediaType === 'video' ? '📹 Video' : '📷 Image'}
                            </span>
                            
                            <span class="text-[var(--text-muted)]">Quality:</span>
                            <span class="font-medium text-[var(--text-primary)]">${data.quality || 'Standard'}</span>

                            <span class="text-[var(--text-muted)]">Method:</span>
                            <span class="font-medium text-green-500">
                                Link + Embed (2 messages)
                            </span>
                        </div>
                        <p class="text-[10px] text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border-color)]">
                            Sends link first, then metadata embed. No direct media upload from your device.
                        </p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Send',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#5865F2',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                reverseButtons: true
            });

            if (!result.isConfirmed) {
                return { sent: false, reason: 'cancelled' };
            }

            // Loading removed to run in background
        }
        // -------------------------------------------------------------------

        // Canonical send flow for video
        if (data.mediaType === 'video' && data.mediaUrl) {
            const videoLinkUrl = isWeibo ? getInlineProxyUrl(data.mediaUrl, data.platform) : data.mediaUrl;

            if (IS_DEV) console.log('[Discord] Using canonical 2x send method (Link -> Embed)');

            const result1 = await sendToWebhook(settings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: APP_NAME,
                    avatar_url: appIcon,
                    content: `${settings.mention ? settings.mention + ' ' : ''}[${mediaLabel}](${videoLinkUrl})`,
                }),
            });

            if (!result1.ok) {
                if (result1.status === 429) {
                    return { sent: false, reason: 'rate_limited', details: `Rate limited. Try again in ${result1.retryAfter || 5}s` };
                }
                return { sent: false, reason: `error_${result1.status}`, details: result1.error };
            }

            markSent(messageKey);
            await new Promise(r => setTimeout(r, 2000));

            const result2 = await sendToWebhook(settings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: APP_NAME,
                    avatar_url: appIcon,
                    embeds: [embed],
                }),
            });

            if (!result2.ok) {
                return { sent: true, details: 'Link sent, embed failed' };
            }

            return { sent: true };
        } else if (data.thumbnail) {
            // Videos/Other: Use THUMBNAIL (small, top-right)
            // This ensures we always have a visual, but avoids overriding the video player in 'link' mode.
            embed.thumbnail = { url: isWeibo ? getInlineProxyUrl(data.thumbnail!, data.platform) : data.thumbnail! };
        }

        // Send embed
        const result = await sendToWebhook(settings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: APP_NAME,
                avatar_url: appIcon,
                content: settings.mention || undefined,
                embeds: [embed],
            }),
        });

        if (result.ok) {
            markSent(messageKey);
            return { sent: true };
        }

        if (result.status === 429) {
            return { sent: false, reason: 'rate_limited', details: `Rate limited. Try again in ${result.retryAfter || 5}s` };
        }

        return { sent: false, reason: `error_${result.status}`, details: result.error };
    } catch (err) {
        console.error('[Discord] Send error:', err);
        return { sent: false, reason: 'error', details: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/**
 * Send multiple items to Discord in batch
 * @param items Array of notification data items
 * @param manual Whether this is a manual send (shows confirmation dialogs)
 * @returns Object with count of sent and failed items
 */
export async function sendDiscordBatch(
    items: Array<{
        platform: string;
        title: string;
        quality: string;
        thumbnail?: string;
        mediaUrl?: string;
        mediaType?: 'video' | 'image' | 'audio';
        sourceUrl?: string;
        author?: string;
        engagement?: { likes?: number; comments?: number; shares?: number; views?: number };
        fileSize?: number;
    }>,
    manual = false
): Promise<{ sent: number; failed: number }> {
    const settings = getUserDiscordSettings();
    
    if (!settings?.enabled || !settings?.webhookUrl) {
        return { sent: 0, failed: items.length };
    }

    if (items.length === 0) {
        return { sent: 0, failed: 0 };
    }

    const result = { sent: 0, failed: 0 };
    const batchDelay = settings.batchDelay || DEFAULT_USER_DISCORD.batchDelay;
    
    // If sendAllOnBatch is false, only send the first item
    const itemsToSend = settings.sendAllOnBatch ? items : [items[0]];

    for (let i = 0; i < itemsToSend.length; i++) {
        const item = itemsToSend[i];
        
        // Add delay between sends (except for first item)
        if (i > 0 && batchDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
        }

        try {
            const sendResult = await sendDiscordNotification(item, manual);
            if (sendResult.sent) {
                result.sent++;
            } else {
                result.failed++;
                if (IS_DEV) {
                    console.log(`[Discord Batch] Item ${i + 1} failed:`, sendResult.reason, sendResult.details);
                }
            }
        } catch (err) {
            result.failed++;
            if (IS_DEV) {
                console.error(`[Discord Batch] Item ${i + 1} error:`, err);
            }
        }
    }

    return result;
}
