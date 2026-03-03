# API Routes (Current Behavior)

This reference reflects the current frontend runtime + backend route behavior used by DownAria.

## Base URLs

- Frontend runtime (BFF): same origin as web app (for example `http://localhost:3001`)
- Backend API: `NEXT_PUBLIC_API_URL` (for example `http://localhost:8080`)

## Route Groups

### Frontend runtime routes (BFF)

These are the routes used by the app UI at runtime:

- `POST /api/web/extract`
- `GET /api/web/proxy`
- `GET /api/web/download`
- `POST /api/web/merge`

Notes:

- Requests are signed before forwarding to backend web routes.
- `/api/web/proxy` is for preview/stream (including HLS playlist rewrite flow).
- `/api/web/download` is the dedicated file-download route.

### Backend public routes

Public endpoints remain available for direct integrations:

- `POST /api/v1/extract`
- `GET /api/v1/proxy`
- `GET /api/v1/download`
- `POST /api/v1/merge`
- `GET /api/v1/stats/public`
- `GET /api/settings`
- `GET /health`

## Core Flows

### 1) Extract

- Runtime app uses `POST /api/web/extract`.
- Request body: `{ "url": "https://...", "cookie": "optional" }`.

### 2) Preview / stream

- Runtime app uses `GET /api/web/proxy?url=...`.
- Used for inline preview, stream playback, HEAD metadata checks, and HLS segment/playlist proxying.

### 3) Download

- Runtime app uses `GET /api/web/download?url=...`.
- Backend public equivalent: `GET /api/v1/download?url=...`.
- This route is separate from `/proxy` by design.

### 4) Merge

`POST /api/web/merge` (or backend public `POST /api/v1/merge`) supports both active modes:

- YouTube URL mode: `url` (+ optional `quality`, `format`, `filename`)
- Direct pair mode: `videoUrl + audioUrl` (+ optional `filename`)

Direct pair mode is used by the frontend for paired audio/video streams (including HLS-paired cases).

## Minimal Examples

```bash
# Extract (public backend)
curl -X POST "http://localhost:8080/api/v1/extract" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Stream/preview (public backend)
curl "http://localhost:8080/api/v1/proxy?url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4"

# Dedicated download (public backend)
curl -L "http://localhost:8080/api/v1/download?url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4&filename=video.mp4"

# Merge by direct pair
curl -X POST "http://localhost:8080/api/v1/merge" \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"https://cdn.example.com/video.m3u8","audioUrl":"https://cdn.example.com/audio.m3u8","filename":"output.mp4"}'
```

## Response Notes

- JSON endpoints return the normal success/error envelope.
- Stream/download/merge success can return binary payloads with headers such as:
  - `Content-Type`
  - `Content-Length`
  - `Content-Disposition`
  - `Accept-Ranges`
