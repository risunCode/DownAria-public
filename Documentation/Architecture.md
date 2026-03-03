# Frontend Architecture and Request Flow

This document reflects the current DownAria frontend runtime behavior.

## 1) Layers

### UI layer
- Home page: `src/app/page.tsx`
- URL input + actions: `src/components/download/DownloadForm.tsx`
- Preview and download controls: `src/components/download/DownloadPreview.tsx`
- History + stats: `src/components/download/HistoryList.tsx`, `src/components/download/PublicStats.tsx`

### Orchestration layer
- Extract/cache orchestration: `src/hooks/useScraperCache.ts`
- Selector and download flow utilities: `src/lib/utils/media.ts`

### Network layer (frontend runtime BFF)
- `POST /api/web/extract`
- `GET /api/web/proxy`
- `GET /api/web/download`
- `POST /api/web/merge`

### Storage layer
- Storage facade: `src/lib/storage/index.ts`
- IndexedDB cache/history: `src/lib/storage/indexed-db.ts`

## 2) Main Flow

1. User submits URL in `DownloadForm`.
2. App resolves cache or calls `POST /api/web/extract`.
3. Extract result is normalized into preview/selector state.
4. Download path is selected by media type:
   - Preview/stream path: `/api/web/proxy`
   - Regular file download path: `/api/web/download`
   - Merge path: `/api/web/merge`

## 3) Merge + HLS Behavior

- Merge supports two active request shapes:
  - YouTube URL mode (`url` + optional quality/format)
  - Direct pair mode (`videoUrl + audioUrl`)
- Frontend format building includes paired audio/video behavior for HLS flows.
- When paired audio exists (or is derived), frontend can route through merge for final output.

## 4) Secondary Flows

- Public stats: `GET /api/v1/stats/public`.
- Runtime settings/update prompt: `GET /api/settings`.
- Discord manual send: user confirmation dialog + mention sanitization before webhook calls.
- Feedback route (`/api/feedback`): sends structured Discord embed fields (Name/Datetime/Comment).

## 5) Environment Usage Notes

- Runtime values are not sourced from a single module only.
- `process.env` is read in multiple server route handlers (for example `src/app/api/web/*`, `src/app/api/feedback/route.ts`) and in shared config (`src/lib/config.ts`).
