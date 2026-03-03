/**
 * Hooks - Barrel Export
 * 
 * Public hooks for client-side data fetching with SWR caching
 */

// Download Sync (shared state between DownloadPreview and MediaGallery)
export { useDownloadSync } from './useDownloadSync';

// Scraper Cache (client-side IndexedDB caching)
export { useScraperCache, fetchMediaWithCache } from './useScraperCache';

// Media Extraction state orchestration
export { useMediaExtraction } from './useMediaExtraction';

// Rate-limit countdown state for retry modal
export { useRateLimitState } from './useRateLimitState';
