/**
 * Storage Module
 * ==============
 * 4 Storage Keys:
 *
 * 1. downaria_settings - All user preferences
 * 2. downaria_cookies - All platform cookies (encrypted)
 * 3. downaria_seasonal - Seasonal effects
 * 4. downaria_queue - Pending downloads queue
 */

// ═══════════════════════════════════════════════════════════════
// INDEXEDDB (History)
// ═══════════════════════════════════════════════════════════════

export {
  initStorage,
  closeDB,
  addHistory,
  getHistory,
  getHistoryCount,
  getHistoryTypeCounts,
  getHistoryByPlatform,
  searchHistory,
  deleteHistory,
  clearHistory,
  exportHistory,
  exportHistoryAsJSON,
  exportHistoryAsBlob,
  downloadHistoryExport,
  importHistory,
  importHistoryFromFile,
  createFullBackup,
  downloadFullBackupAsZip,
  importFullBackupFromZip,
  getStorageStats,
  type FullBackupData,
  type HistoryEntry,
  type ExportData,
  type HistoryTypeCounts,
} from './indexed-db';

// ═══════════════════════════════════════════════════════════════
// ENCRYPTED STORAGE
// ═══════════════════════════════════════════════════════════════

export {
  getEncryptedCookies,
  setEncryptedCookies,
  clearAllCookies,
  setEncrypted,
  getEncrypted,
  removeEncrypted,
  isEncrypted,
  type CookieStorage,
} from './crypto';

// ═══════════════════════════════════════════════════════════════
// UNIFIED SETTINGS
// ═══════════════════════════════════════════════════════════════

export {
  STORAGE_KEYS,
  DEFAULT_DISCORD,
  getUnifiedSettings,
  saveUnifiedSettings,
  resetUnifiedSettings,
  getTheme,
  getResolvedTheme,
  getTimeBasedTheme,
  saveTheme,
  applyTheme,
  initTheme,
  cleanupAutoTheme,
  getAccentColor,
  applyAccentColor,
  saveAccentColor,
  initAccentColor,
  ACCENT_COLOR_PRESETS,
  getPlatformCookie,
  savePlatformCookie,
  clearPlatformCookie,
  hasPlatformCookie,
  getAllCookieStatus,
  getSkipCache,
  setSkipCache,
  getLanguagePreference,
  setLanguagePreference,
  getResolvedLocale,
  getDismissedAnnouncements,
  dismissAnnouncement,
  isAnnouncementDismissed,
  getUpdateDismissed,
  setUpdateDismissed,
  getDiscordSettings,
  saveDiscordSettings,
  getUserDiscordSettings,
  saveUserDiscordSettings,
  type DownAriaSettings,
  type DiscordSettings,
  type ThemeType,
  type ResolvedTheme,
  type CookiePlatform,
  type LanguagePreference,
  type AccentColorType,
} from './settings';

// ═══════════════════════════════════════════════════════════════
// SEASONAL EFFECTS
// ═══════════════════════════════════════════════════════════════

export {
  getSeasonalSettings,
  saveSeasonalSettings,
  setSeasonalMode,
  setCustomBackground,
  setBackgroundPosition,
  setBackgroundOpacity,
  setBackgroundBlur,
  setBackgroundZoom,
  setBackgroundSound,
  setBackgroundVolume,
  setBackgroundEnabled,
  setCardOpacity,
  setParticleIntensity,
  setParticleOpacity,
  setParticleSpeed,
  setParticlesWithBackground,
  setRandomInterval,
  resetSeasonalSettings,
  saveBackgroundBlob,
  getBackgroundBlob,
  deleteBackgroundBlob,
  processBackgroundFile,
  loadBackgroundFromDB,
  clearCustomBackground,
  getCurrentSeason,
  getRandomSeason,
  getCurrentRandomSeason,
  startRandomRotation,
  stopRandomRotation,
  getSeasonEmoji,
  getSeasonName,
  fileToDataUrl,
  formatFileSize,
  isValidImageUrl,
  useSeasonalSettings,
  ACTIVE_SEASONS,
  type UseSeasonalSettingsReturn,
  type SeasonType,
  type BackgroundType,
  type BackgroundPosition,
  type CustomBackground,
  type SeasonalSettings,
} from './seasonal';

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE CACHE (Scraper Results)
// ═══════════════════════════════════════════════════════════════

export {
  initCache,
  cacheGet,
  cacheSet,
  cacheDelete,
  clearExpiredCache as clearExpiredClientCache,
  clearAllCache as clearAllClientCache,
  cleanupIfNeeded as cleanupClientCache,
  getCacheStats,
  resetCacheStats,
  type CachedResult,
  type CacheStats,
} from './client-cache';

export {
  extractContentId,
  isStoryLikeContent,
  makeContentCacheKey,
} from '../utils/content-id';

export {
  ContentCache,
  createContentCache,
  DEFAULT_CONTENT_CACHE_MAX_ENTRIES,
  DEFAULT_PLATFORM_TTL_MS,
  DEFAULT_STORY_CACHE_TTL_MS,
  type ContentCacheConfig,
  type ContentCacheEntry,
  type ContentCacheGetOptions,
  type ContentCacheSetOptions,
} from './content-cache';
