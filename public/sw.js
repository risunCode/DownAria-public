// DownAria Service Worker - Offline First PWA
// Cache version - update this on each deploy or use build timestamp
const BUILD_TIME = '20260426073932'; // YYYYMMDD format - UPDATE ON DEPLOY
const CACHE_VERSION = `v6-${BUILD_TIME}`;
const STATIC_CACHE = `downaria-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `downaria-dynamic-${CACHE_VERSION}`;
const API_CACHE = `downaria-api-${CACHE_VERSION}`;

// App shell - core files needed for offline
const APP_SHELL = [
  '/',
  '/about',
  '/offline',
  '/icon.png',
  '/icon-512.png',
  '/manifest.json'
];

// API endpoints to cache
const CACHEABLE_API = [];

// Long-lived cache for proxied media (30 days)
const MEDIA_CACHE = `downaria-media-${CACHE_VERSION}`;
const MEDIA_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

// Cache duration for API responses (5 minutes)
const API_CACHE_TTL = 5 * 60 * 1000;
const API_CACHE_TIME_HEADER = 'x-downaria-sw-cached-at';

// Stateful pages should avoid long-lived cache entries
const STATEFUL_PAGES = ['/history', '/settings'];

// Install - pre-cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old xtfetch caches (migration)
              if (name.startsWith('xtfetch-')) return true;
              // Delete old downaria caches
              return name.startsWith('downaria-') && 
                     name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE &&
                     name !== API_CACHE &&
                     name !== MEDIA_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return;
  
  // Strategy based on request type
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    // Static assets - Cache first
    event.respondWith(handleStaticRequest(request));
  } else {
    // Pages - Stale while revalidate
    event.respondWith(handlePageRequest(request));
  }
});

// Check if request is for static asset
function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isStatefulPage(pathname) {
  return STATEFUL_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

async function cacheApiResponseWithTimestamp(request, response, cacheName = API_CACHE) {
  const cache = await caches.open(cacheName);
  const cloned = response.clone();
  const body = await cloned.blob();
  const headers = new Headers(cloned.headers);
  headers.set(API_CACHE_TIME_HEADER, String(Date.now()));
  const stampedResponse = new Response(body, {
    status: cloned.status,
    statusText: cloned.statusText,
    headers,
  });
  await cache.put(request, stampedResponse);
}

async function getFreshCachedApiResponse(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  if (!cached) return null;

  const cachedAt = Number(cached.headers.get(API_CACHE_TIME_HEADER) || 0);
  const age = Date.now() - cachedAt;
  if (!cachedAt || age > API_CACHE_TTL) {
    await cache.delete(request);
    return null;
  }

  return cached;
}

// Handle API requests - Network first, cache fallback
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Special handling for proxied media (Cache first)
  // Support both old local /api/proxy and new backend /api/v1/proxy
  if (url.pathname === '/api/proxy' || url.pathname.endsWith('/v1/proxy')) {
    const mediaCache = await caches.open(MEDIA_CACHE);
    const cached = await mediaCache.match(request);
    if (cached) {
      // Check TTL for media
      const cachedAt = Number(cached.headers.get(API_CACHE_TIME_HEADER) || 0);
      if (cachedAt && (Date.now() - cachedAt < MEDIA_CACHE_TTL)) {
        return cached;
      }
      await mediaCache.delete(request);
    }

    try {
      const response = await fetch(request);
      if (response.ok && response.headers.get('Content-Type')?.startsWith('image/')) {
        await cacheApiResponseWithTimestamp(request, response, MEDIA_CACHE);
      }
      return response;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  // Only cache specific API endpoints
  const shouldCache = CACHEABLE_API.some(api => url.pathname.startsWith(api));
  
  try {
    const response = await fetch(request);
    
    if (response.ok && shouldCache) {
      await cacheApiResponseWithTimestamp(request, response);
    }
    
    return response;
  } catch (error) {
    // Offline - try cache
    if (shouldCache) {
      const cached = await getFreshCachedApiResponse(request);
      if (cached) {
        console.log('[SW] Serving cached API:', url.pathname);
        return cached;
      }
    }
    
    throw error;
  }
}

// Handle static assets - Cache first
async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return placeholder for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      return caches.match('/icon.png');
    }
    throw error;
  }
}

// Handle page requests - Network first with cache fallback
async function handlePageRequest(request) {
  const url = new URL(request.url);
  const stateful = isStatefulPage(url.pathname);

  // ALWAYS try network first for pages to get fresh content
  try {
    const response = await fetch(request);
    if (response.ok && !stateful) {
      // Cache the fresh response for offline use
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Network failed - try cache (offline mode)
    if (!stateful) {
      const cached = await caches.match(request);
      if (cached) {
        console.log('[SW] Serving cached page (offline):', request.url);
        return cached;
      }
    }
    // No cache - return offline fallback
    return caches.match('/offline');
  }
}

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.startsWith('downaria-') || name.startsWith('xtfetch-')) {
          caches.delete(name);
        }
      });
    });
  }
});

// Background sync for failed downloads (future feature)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-downloads') {
    console.log('[SW] Syncing downloads...');
    // Future: retry failed downloads
  }
});

// ═══════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

// Handle push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'DownAria',
    body: 'New notification',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'downaria-notification',
    data: { url: '/' }
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      // If not JSON, use as body text
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    tag: data.tag || 'downaria-notification',
    data: data.data || { url: '/' },
    vibrate: [100, 50, 100],
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Get URL from notification data
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

console.log('[SW] Service Worker loaded');
