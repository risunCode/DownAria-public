/**
 * Storage Module
 * ==============
 * 3 Storage Keys:
 *
 * 1. downaria_settings - All user preferences
 * 2. downaria_cookies - All platform cookies (encrypted)
 * 3. downaria_seasonal - Seasonal effects
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
  setScraperCache,
  getScraperCache,
  clearScraperCache,
  cleanupExpiredScraperCache,
  type FullBackupData,
  type HistoryEntry,
  type ExportData,
  type HistoryTypeCounts,
  type ScraperCacheEntry,
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
  ACCENT_COLOR_PRESETS,
  type DownAriaSettings,
  type DiscordSettings,
  type ThemeType,
  type ResolvedTheme,
  type CookiePlatform,
  type LanguagePreference,
  type AccentColorType,
} from './settings.model';

export {
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
} from './settings.theme';

export {
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
} from './settings.user';

export {
  getPlatformCookie,
  savePlatformCookie,
  clearPlatformCookie,
  hasPlatformCookie,
  getAllCookieStatus,
} from './settings.cookies';

export {
  startRandomRotation,
  stopRandomRotation,
  type SeasonType,
  type BackgroundType,
  type BackgroundPosition,
  type CustomBackground,
  type SeasonalSettings,
} from './seasonal';

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
  setParticleIntensity,
  setParticleOpacity,
  setParticleSpeed,
  resetSeasonalSettings,
  clearCustomBackground,
} from './seasonal';

export {
  saveBackgroundBlob,
  getBackgroundBlob,
  deleteBackgroundBlob,
  processBackgroundFile,
  loadBackgroundFromDB,
  formatFileSize,
} from './seasonal.background';
