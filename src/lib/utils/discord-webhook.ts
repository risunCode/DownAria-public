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

import { lazySwal } from '@/lib/utils/lazy-swal';
import { formatBytes, formatNumber } from './format';
import { BASE_URL, IS_DEV } from '@/lib/config';
import { getProxyUrl as buildProxyUrl } from '@/lib/api/proxy';
import { 
  getUserDiscordSettings, 
  DEFAULT_DISCORD,
  type DiscordSettings 
} from '@/lib/storage/settings';

const APP_NAME = 'DownAria';
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB - Discord stops auto-embedding above this

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const getAppIcon = () => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/icon.png`;
    }
    return BASE_URL ? `${BASE_URL}/icon.png` : '/icon.png';
};

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
    return buildProxyUrl(mediaUrl, { platform: platform.toLowerCase() });
}

function normalizeMentionContent(raw: string | undefined): string {
    const value = (raw || '').trim();
    if (!value) return '';

    // Only allow real Discord mention tokens, ignore accidental text like "aa"
    const mentionTokenRe = /^(?:@everyone|@here|<@!?\d+>|<@&\d+>)(?:\s+(?:@everyone|@here|<@!?\d+>|<@&\d+>))*$/;
    return mentionTokenRe.test(value) ? value : '';
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
    const isLarge = size > LARGE_FILE_THRESHOLD;
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
    quality?: string;
    thumbnail?: string;
    mediaUrl?: string;
    mediaType?: 'video' | 'image' | 'audio';
    contentType?: string;
    sourceUrl?: string;
    author?: string;
    engagement?: { likes?: number; comments?: number; shares?: number; views?: number };
    fileSize?: number;
}, manual = false): Promise<{ sent: boolean; reason?: string; details?: string }> {
    const settings = getUserDiscordSettings();

    if (!settings?.enabled) {
        return { sent: false, reason: 'disabled' };
    }

    if (!manual && !settings.autoSend) {
        return { sent: false, reason: 'auto_send_disabled' };
    }

    if (!settings?.webhookUrl) {
        return { sent: false, reason: 'no_webhook' };
    }

    let sendPhase: 'first' | 'second' = 'first';

    try {
        const appIcon = getAppIcon();
        const linkTarget = data.mediaUrl
            ? data.mediaUrl
            : data.sourceUrl;

        if (!linkTarget) {
            return { sent: false, reason: 'no_link' };
        }

        if (manual) {
            const sendMethodLabel = settings.sendMethod === 'single'
                ? 'Single message'
                : 'Double message (link + embed)';
            const fileSizeLabel = data.fileSize && data.fileSize > 0 ? formatBytes(data.fileSize) : 'Unknown';

            const confirm = await lazySwal.fire({
                icon: 'question',
                title: 'Send to Discord?',
                html: `<div style="text-align:left">` +
                    `<div><b>Platform:</b> ${escapeHtml(data.platform || 'Unknown')}</div>` +
                    `<div><b>Type:</b> ${escapeHtml(data.mediaType || data.contentType || data.quality || 'media')}</div>` +
                    `<div><b>Size:</b> ${escapeHtml(fileSizeLabel)}</div>` +
                    `<div><b>Method:</b> ${escapeHtml(sendMethodLabel)}</div>` +
                    `</div>`,
                showCancelButton: true,
                confirmButtonText: 'Send',
                cancelButtonText: 'Cancel',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                confirmButtonColor: 'var(--accent-primary)',
            });

            if (!confirm.isConfirmed) {
                return { sent: false, reason: 'cancelled' };
            }
        }

        const fields: Array<{ name: string; value: string; inline: boolean }> = [];

        const platformLabel = data.platform?.trim() || 'Unknown Platform';
        const typeOrContentType = data.mediaType?.trim() || data.contentType?.trim() || data.quality?.trim();
        const markdownLabel = typeOrContentType ? `${platformLabel} ${typeOrContentType}` : platformLabel;
        const linkMarkdown = `[${markdownLabel}](${linkTarget})`;

        fields.push({ name: 'Platform', value: platformLabel, inline: true });

        if (typeOrContentType) {
            fields.push({ name: 'Type', value: typeOrContentType, inline: true });
        }

        if (data.author) {
            fields.push({ name: 'Author', value: data.author, inline: true });
        }

        if (data.fileSize && data.fileSize > 0) {
            fields.push({ name: 'Size', value: formatBytes(data.fileSize), inline: true });
        }

        const parsedColor = parseInt((settings.embedColor || '#5865F2').replace('#', ''), 16);
        const embedColor = Number.isNaN(parsedColor) ? parseInt('5865F2', 16) : parsedColor;

        const metadataEmbed: Record<string, unknown> = {
            author: { name: `${platformLabel} Downloader` },
            title: 'Open Media Source',
            color: embedColor,
            fields,
            footer: { text: settings.footerText || 'via DownAria', icon_url: appIcon },
            timestamp: new Date().toISOString(),
        };

        if (data.sourceUrl) {
            metadataEmbed.url = data.sourceUrl;
        }

        if (data.thumbnail) {
            metadataEmbed.thumbnail = { url: data.thumbnail };
        }

        const mention = normalizeMentionContent(settings.mention);

        const firstResponse = await fetch(settings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: APP_NAME,
                avatar_url: appIcon,
                content: linkMarkdown,
            }),
        });

        if (!firstResponse.ok && firstResponse.status !== 204) {
            return { sent: false, reason: `error_first_${firstResponse.status}` };
        }

        sendPhase = 'second';

        const secondResponse = await fetch(settings.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: APP_NAME,
                avatar_url: appIcon,
                ...(mention ? { content: mention } : {}),
                embeds: [metadataEmbed],
            }),
        });

        if (!secondResponse.ok && secondResponse.status !== 204) {
            return { sent: false, reason: `error_second_${secondResponse.status}` };
        }

        return { sent: true };
    } catch (error) {
        console.error('[Discord] Send error:', error);
        return { sent: false, reason: `error_${sendPhase}_network` };
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
    const batchDelay = settings.batchDelay || DEFAULT_DISCORD.batchDelay;
    
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
