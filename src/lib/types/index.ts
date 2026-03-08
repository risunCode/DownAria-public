// ============================================================================
// PLATFORM TYPES (Aligned with Backend)
// ============================================================================

/** Platform identifier - aligned with backend PlatformId */
export type PlatformId = 
    | 'facebook' | 'instagram' | 'threads' | 'twitter' | 'tiktok' | 'youtube'
    | 'bilibili' | 'reddit' | 'soundcloud'
    | 'eporner' | 'pornhub' | 'rule34video' | 'erome' | 'pixiv';

// ============================================================================
// ENGAGEMENT STATS (Aligned with Backend)
// ============================================================================

/**
 * Engagement Statistics - aligned with backend EngagementStats
 * Normalized across all platforms for consistent display
 */
export interface EngagementStats {
    views?: number;       // View/play count
    likes?: number;       // Like/favorite/heart count
    comments?: number;    // Comment count
    shares?: number;      // Unified: retweets, reposts, shares
    bookmarks?: number;   // Save/bookmark count
}

// Media format interface
export interface MediaFormat {
    quality: string;
    type: 'video' | 'audio' | 'image';
    url: string;
    size?: string;
    fileSize?: string; // Human-readable file size (e.g. "32.5 MB")
    filesize?: number; // File size in bytes
    filesizeEstimated?: boolean; // True if filesize is estimated (YouTube)
    format?: string;
    mimeType?: string;
    filename?: string; // Custom filename hint
    itemId?: string; // To group multiple formats of the same item (e.g. multiple images in a post)
    thumbnail?: string; // Specific thumbnail for this item
    width?: number;
    height?: number;
    isHLS?: boolean; // Flag for HLS/m3u8 streams (YouTube)
    needsMerge?: boolean; // YouTube: video-only format that needs audio merge
    audioUrl?: string; // YouTube: best audio URL for merging
    extension?: string;
    hash?: string;
    codec?: string;
    bitrate?: number;
    resolution?: string;
    label?: string;
    hasAudio?: boolean;
    pairedAudioUrl?: string;
    pairedVideoUrl?: string;
    requestedAudioFormat?: 'mp3' | 'm4a';
    isSyntheticAudioOption?: boolean;
    canConvertAudio?: boolean;
    formatId?: string;
}

// Download response from API
export interface DownloadResponse {
    success: boolean;
    platform: PlatformId;
    data?: MediaData;
    error?: string;
    errorCode?: string;
}

// Media data extracted from URL
export interface MediaData {
    title: string;
    thumbnail: string;
    duration?: string;
    author?: string;
    authorUsername?: string;
    authorAlias?: string;
    authorUrl?: string;
    views?: string;
    description?: string;
    formats: MediaFormat[];
    url: string;
    embedHtml?: string;
    usedCookie?: boolean;
    cached?: boolean;
    responseTime?: number;
    engagement?: EngagementStats;
    // New fields from Go Backend
    platform?: string;
    contentType?: string;
    id?: string;
    uploadDate?: string;
}

// Backend Response Types (Go Backend - extract)
// Consistent response format across all extractors (native + yt-dlp)
export interface ExtractResult {
    url: string;
    platform: string;
    mediaType: 'story' | 'reel' | 'video' | 'post' | 'image' | 'audio' | 'unknown';
    author: {
        name?: string;
        handle?: string;
    };
    content: {
        id?: string;
        text?: string;
        description?: string;
        createdAt?: string;
    };
    engagement: {
        views: number;
        likes: number;
        comments: number;
        shares: number;
        bookmarks: number;
    };
    media: Array<{
        index: number;
        type: 'video' | 'image' | 'audio' | 'unknown';
        thumbnail?: string;
        variants: Array<{
            quality: string;
            url: string;
            resolution?: string;
            mime?: string;
            format?: string;
            filesize?: number;
            bitrate?: number;
            codec?: string;
            hasAudio?: boolean;
            requiresMerge?: boolean;
            requiresProxy?: boolean;
            formatId?: string;
            filename?: string;
        }>;
    }>;
    authentication: {
        used: boolean;
        source: 'none' | 'server' | 'client';
    };
}

// History item stored in localStorage
export interface HistoryItem {
    id: string;
    url: string;
    platform: PlatformId;
    title: string;
    thumbnail: string;
    downloadedAt: string;
    quality: string;
    type: 'video' | 'audio' | 'image';
}

// API request body
export interface DownloadRequest {
    url: string;
}

// Platform configuration
export interface PlatformConfig {
    id: PlatformId;
    name: string;
    icon: string;
    color: string;
    placeholder: string;
    patterns: RegExp[];
}

// Platform configurations
export const PLATFORMS: PlatformConfig[] = [
    {
        id: 'facebook',
        name: 'Facebook',
        icon: '📘',
        color: '#1877f2',
        placeholder: 'https://www.facebook.com/watch?v=...',
        patterns: [
            /^(https?:\/\/)?(www\.|m\.|web\.)?facebook\.com\/.+/,
            /^(https?:\/\/)?(www\.)?fb\.(watch|gg|me)\/.+/,
            /^(https?:\/\/)?l\.facebook\.com\/.+/,
        ],
    },
    {
        id: 'instagram',
        name: 'Instagram',
        icon: '📸',
        color: '#e4405f',
        placeholder: 'https://www.instagram.com/reel/...',
        patterns: [
            /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/.+/,
            /^(https?:\/\/)?instagr\.am\/.+/,
            /^(https?:\/\/)?(www\.)?ig\.me\/.+/,
            /^(https?:\/\/)?ddinstagram\.com\/.+/,
        ],
    },
    {
        id: 'threads',
        name: 'Threads',
        icon: '🧵',
        color: '#1f2937',
        placeholder: 'https://www.threads.com/@user/post/...',
        patterns: [
            /^(https?:\/\/)?(www\.)?threads\.(com|net)\/@[^/]+\/post\/.+/,
        ],
    },
    {
        id: 'twitter',
        name: 'X',
        icon: '𝕏',
        color: '#ffffff',
        placeholder: 'https://twitter.com/user/status/...',
        patterns: [
            /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+\/status\/.+/,
            /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/i\/status\/.+/,
            /^(https?:\/\/)?t\.co\/.+/,
            /^(https?:\/\/)?(www\.)?fxtwitter\.com\/.+/,
            /^(https?:\/\/)?(www\.)?vxtwitter\.com\/.+/,
            /^(https?:\/\/)?(www\.)?fixupx\.com\/.+/,
        ],
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        icon: '🎵',
        color: '#00f2ea',
        placeholder: 'https://www.tiktok.com/@user/video/...',
        patterns: [
            /^(https?:\/\/)?(www\.|vm\.|vt\.|m\.)?tiktok\.com\/.+/,
            /^(https?:\/\/)?tiktok\.com\/.+/,
        ],
    },
    {
        id: 'youtube',
        name: 'YouTube',
        icon: '▶️',
        color: '#ff0000',
        placeholder: 'https://www.youtube.com/watch?v=...',
        patterns: [
            /^(https?:\/\/)?(www\.|m\.|music\.)?youtube\.com\/(watch|shorts|embed)\?.+/,
            /^(https?:\/\/)?(www\.|m\.|music\.)?youtube\.com\/shorts\/.+/,
            /^(https?:\/\/)?youtu\.be\/.+/,
        ],
    },
    // Generic platforms (yt-dlp/gallery-dl)
    {
        id: 'bilibili',
        name: 'BiliBili',
        icon: '📺',
        color: '#00a1d6',
        placeholder: 'https://www.bilibili.com/video/...',
        patterns: [
            /^(https?:\/\/)?(www\.)?bilibili\.com\/video\/.+/,
            /^(https?:\/\/)?b23\.tv\/.+/,
        ],
    },
    {
        id: 'reddit',
        name: 'Reddit',
        icon: '🔶',
        color: '#ff4500',
        placeholder: 'https://www.reddit.com/r/.../comments/...',
        patterns: [
            /^(https?:\/\/)?(www\.|old\.)?reddit\.com\/.+/,
            /^(https?:\/\/)?redd\.it\/.+/,
            /^(https?:\/\/)?v\.redd\.it\/.+/,
        ],
    },
    {
        id: 'soundcloud',
        name: 'SoundCloud',
        icon: '🎧',
        color: '#ff5500',
        placeholder: 'https://soundcloud.com/...',
        patterns: [
            /^(https?:\/\/)?(www\.|m\.)?soundcloud\.com\/.+/,
        ],
    },
    {
        id: 'pixiv',
        name: 'Pixiv',
        icon: '🎨',
        color: '#0096fa',
        placeholder: 'https://www.pixiv.net/artworks/...',
        patterns: [
            /^(https?:\/\/)?(www\.)?pixiv\.net\/(artworks|en\/artworks)\/.+/,
        ],
    },
    {
        id: 'erome',
        name: 'Erome',
        icon: '🔞',
        color: '#ff69b4',
        placeholder: 'https://www.erome.com/a/...',
        patterns: [
            /^(https?:\/\/)?(www\.)?erome\.com\/(a|i)\/.+/,
        ],
    },
    {
        id: 'eporner',
        name: 'Eporner',
        icon: '🔞',
        color: '#ff69b4',
        placeholder: 'https://www.eporner.com/video-...',
        patterns: [
            /^(https?:\/\/)?(www\.)?eporner\.com\/video-.+/,
        ],
    },
    {
        id: 'pornhub',
        name: 'PornHub',
        icon: '🔞',
        color: '#ff9000',
        placeholder: 'https://www.pornhub.com/view_video.php?viewkey=...',
        patterns: [
            /^(https?:\/\/)?(www\.)?pornhub\.com\/view_video\.php\?.+/,
            /^(https?:\/\/)?(www\.)?pornhubpremium\.com\/.+/,
        ],
    },
    {
        id: 'rule34video',
        name: 'Rule34Video',
        icon: '🔞',
        color: '#aae5a4',
        placeholder: 'https://rule34video.com/videos/...',
        patterns: [
            /^(https?:\/\/)?(www\.)?rule34video\.com\/videos?\/.+/,
        ],
    },
];



// ============================================================================
// ERROR TYPES (Shared with Backend)
// ============================================================================

export * from './error.types';
