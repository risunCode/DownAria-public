# Frontend Architecture and Request Flow

This document reflects the current frontend implementation after the latest config and API flow refactors.

## 1) Architecture layers

### UI layer
- Main downloader page: `src/app/page.tsx`
- Share page: `src/app/share/page.tsx`
- URL input form: `src/components/download/DownloadForm.tsx`
- Preview and download actions: `src/components/download/DownloadPreview.tsx`
- History and public stats: `src/components/download/HistoryList.tsx`, `src/components/download/PublicStats.tsx`

### Orchestration layer
- Extract and cache orchestration: `src/hooks/useScraperCache.ts`
- Public settings fetch (SWR): `src/hooks/useUpdatePrompt.ts`

### Network layer
- API client (timeout and retry): `src/lib/api/client.ts`
- Proxy URL builder: `src/lib/api/proxy.ts`
- Download helper (regular, HLS, merge): `src/lib/utils/media.ts`

### Storage layer
- Storage facade: `src/lib/storage/index.ts`
- IndexedDB cache and history: `src/lib/storage/indexed-db.ts`

### Config layer
- Single runtime env source: `src/lib/config.ts`

## 2) Main request flow (Extract -> Preview -> Download)

1. User submits a URL in `DownloadForm`; the main handler runs in `src/app/page.tsx`.
2. The URL is sanitized and platform-detected, then routed into the cache/extract flow (`fetchMediaWithCache` / `useScraperCache`).
3. On cache miss, the frontend calls `POST /api/web/extract` via `api.post(...)`.
4. The backend response is normalized into the `MediaData` shape and rendered by `DownloadPreview`.
5. When the user downloads:
   - Normal flow: media URL is wrapped by `getProxyUrl` -> `GET /api/web/proxy`.
   - Merge/convert flow: `POST /api/web/merge`.
   - Legacy HLS flow: playlist and segments via `GET /api/v1/proxy`.

## 3) Secondary flows

- Public stats: polls `GET /api/v1/stats/public` every 20 seconds (`PublicStats`).
- Update prompt/settings: `GET /api/settings` via SWR (`useUpdatePrompt`).
- Discord helper (client-side): checks media size/proxy metadata using `GET /api/v1/proxy` before webhook send (`discord-webhook.ts`).

## 4) Implementation notes

- The frontend runtime no longer reads `process.env` in multiple places; values are centralized in `src/lib/config.ts`.
- End-user application traffic primarily uses `/api/web/*`, with compatibility flows still using `/api/v1/proxy` and `/api/v1/stats/public`.
