import type { PlatformId } from '../types';

type ContentIdExtractor = (url: string) => string | null;

const CONTENT_ID_EXTRACTORS: Record<PlatformId, ContentIdExtractor> = {
  twitter: (url) => {
    const match = url.match(/status(?:es)?\/(\d+)/i);
    return match ? match[1] : null;
  },

  instagram: (url) => {
    const shortcode = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    if (shortcode) return shortcode[1];

    const storyId = url.match(/\/stories\/[^/]+\/(\d+)/i);
    if (storyId) return `story:${storyId[1]}`;

    return null;
  },

  threads: (url) => {
    const postId = url.match(/\/@[^/]+\/post\/([A-Za-z0-9_-]+)/i);
    return postId ? postId[1] : null;
  },

  facebook: (url) => {
    const videoId = url.match(/\/(?:videos?|watch|reel)\/(\d+)/i);
    if (videoId) return videoId[1];

    const watchParam = url.match(/[?&]v=(\d+)/i);
    if (watchParam) return watchParam[1];

    const storyFbid = url.match(/story_fbid=(\d+)/i);
    if (storyFbid) return storyFbid[1];

    const pfbid = url.match(/pfbid([A-Za-z0-9]+)/i);
    if (pfbid) return `pfbid${pfbid[1]}`;

    const shareId = url.match(/\/share\/[prvs]\/([A-Za-z0-9]+)/i);
    if (shareId) return `share:${shareId[1]}`;

    const storyId = url.match(/\/stories\/[^/]+\/(\d+)/i);
    if (storyId) return `story:${storyId[1]}`;

    return null;
  },

  tiktok: (url) => {
    const videoId = url.match(/\/video\/(\d+)/i);
    if (videoId) return videoId[1];

    const fullUrl = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
    if (fullUrl) return fullUrl[1];

    return null;
  },

  youtube: (url) => {
    const watchId = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchId) return watchId[1];

    const shortId = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortId) return shortId[1];

    const shortsId = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsId) return shortsId[1];

    return null;
  },

  bilibili: (url) => {
    const bvId = url.match(/\/video\/(BV[a-zA-Z0-9]+)/i);
    if (bvId) return bvId[1];

    const avId = url.match(/\/video\/av(\d+)/i);
    if (avId) return `av${avId[1]}`;

    return null;
  },

  reddit: (url) => {
    const postId = url.match(/\/comments\/([a-z0-9]+)/i);
    return postId ? postId[1] : null;
  },

  soundcloud: (url) => {
    const trackPath = url.match(/soundcloud\.com\/([^/]+\/[^/?]+)/i);
    return trackPath ? trackPath[1].replace('/', ':') : null;
  },

  pixiv: (url) => {
    const artworkId = url.match(/\/artworks\/(\d+)/i);
    return artworkId ? artworkId[1] : null;
  },

  erome: (url) => {
    const albumId = url.match(/\/a\/([A-Za-z0-9]+)/i);
    return albumId ? albumId[1] : null;
  },

  eporner: (url) => {
    const videoId = url.match(/\/video-([a-zA-Z0-9]+)/i);
    return videoId ? videoId[1] : null;
  },

  pornhub: (url) => {
    const viewkey = url.match(/viewkey=([a-zA-Z0-9]+)/i);
    return viewkey ? viewkey[1] : null;
  },

  rule34video: (url) => {
    const postId = url.match(/\/post\/(\d+)/i);
    return postId ? postId[1] : null;
  },
};

export function extractContentId(platform: PlatformId, url: string): string | null {
  const extractor = CONTENT_ID_EXTRACTORS[platform];
  return extractor ? extractor(url.trim()) : null;
}

export function makeContentCacheKey(platform: PlatformId, contentId: string): string {
  return `${platform}:${contentId}`;
}

export function isStoryLikeContent(url: string, contentId: string): boolean {
  return url.includes('/stories/') || contentId.startsWith('story:');
}
