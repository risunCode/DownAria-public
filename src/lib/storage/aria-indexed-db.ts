export const ARIA_INDEX_DB_NAME = 'ariaindex';
const ARIA_INDEX_DB_VERSION = 1;

export const HISTORY_STORE = 'history';
export const SCRAPER_CACHE_STORE = 'scraper_cache';
export const BACKGROUNDS_STORE = 'backgrounds';

let dbInstance: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase> | null = null;

function ensureStores(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(HISTORY_STORE)) {
    const historyStore = database.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
    historyStore.createIndex('platform', 'platform', { unique: false });
    historyStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
    historyStore.createIndex('contentId', 'contentId', { unique: false });
  }

  if (!database.objectStoreNames.contains(SCRAPER_CACHE_STORE)) {
    const cacheStore = database.createObjectStore(SCRAPER_CACHE_STORE, { keyPath: 'key' });
    cacheStore.createIndex('platform', 'platform', { unique: false });
    cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
    cacheStore.createIndex('lastAccess', 'lastAccess', { unique: false });
  }

  if (!database.objectStoreNames.contains(BACKGROUNDS_STORE)) {
    database.createObjectStore(BACKGROUNDS_STORE, { keyPath: 'id' });
  }
}

export function openAriaIndexDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available'));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (openPromise) {
    return openPromise;
  }

  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(ARIA_INDEX_DB_NAME, ARIA_INDEX_DB_VERSION);

    request.onerror = () => {
      openPromise = null;
      reject(request.error);
    };

    request.onupgradeneeded = () => {
      ensureStores(request.result);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        openPromise = null;
      };
      resolve(dbInstance);
    };
  });

  return openPromise;
}

export function closeAriaIndexDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  openPromise = null;
}
