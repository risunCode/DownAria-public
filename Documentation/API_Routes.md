# API Reference (Current Backend)

This document references the current implementation in `BringAlive/DownAria-API/internal/app/routes.go` and related handlers.

## Base URL

- Development default: `http://localhost:8080`
- Production: use your deployed API host.

## Response Envelope

All JSON endpoints use a shared envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "4f2e3e...",
    "timestamp": "2026-03-01T10:11:12Z",
    "responseTime": 123,
    "accessMode": "public",
    "publicContent": true
  }
}
```

Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "url is required and must be a valid http/https url"
  },
  "meta": {
    "requestId": "4f2e3e...",
    "timestamp": "2026-03-01T10:11:12Z",
    "responseTime": 5
  }
}
```

Notes:

- `proxy` and `merge` can return a binary stream on success.
- `X-Request-ID` is also returned in response headers.

## Endpoint Summary

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/settings` | Public runtime settings |
| `GET` | `/api/v1/stats/public` | Public runtime statistics |
| `POST` | `/api/web/extract` | Extract media (protected with origin + anti-bot) |
| `GET` | `/api/web/proxy` | Proxy/stream media (protected with origin + anti-bot) |
| `POST` | `/api/web/merge` | Merge video+audio (protected with origin + anti-bot) |
| `POST` | `/api/v1/extract` | Public extract endpoint |
| `GET` | `/api/v1/proxy` | Public proxy/stream endpoint |
| `POST` | `/api/v1/merge` | Public merge endpoint |

## Route Group Behavior

### `/api/web/*`

Used by the DownAria frontend. This group has extra middleware:

- `RequireOrigin` (origin allowlist)
- `BlockBotAccess` (anti-bot filter)

### `/api/v1/*`

Public API without origin-protection and anti-bot middleware.

## Endpoint Details

### `GET /health`

Simple health check.

Example response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-03-01T10:11:12Z"
  }
}
```

---

### `GET /api/settings`

Returns public backend settings.

Current `data` fields:

- `public_base_url` (string)
- `merge_enabled` (boolean)
- `upstream_timeout_ms` (number)
- `global_rate_limit_limit` (number)
- `global_rate_limit_window` (string duration, for example `4m0s`)
- `global_rate_limit_rule` (string, for example `200/4m0s`)
- `allowed_origins` (array of strings)
- `max_download_size_mb` (number)

Example:

```json
{
  "success": true,
  "data": {
    "public_base_url": "https://api.example.com",
    "merge_enabled": true,
    "upstream_timeout_ms": 30000,
    "global_rate_limit_limit": 200,
    "global_rate_limit_window": "4m0s",
    "global_rate_limit_rule": "200/4m0s",
    "allowed_origins": ["https://downaria.example.com"],
    "max_download_size_mb": 400
  }
}
```

---

### `GET /api/v1/stats/public`

Public in-memory runtime statistics.

`data` fields:

- `todayVisits`
- `totalVisits`
- `totalExtractions`
- `totalDownloads`

Example:

```json
{
  "success": true,
  "data": {
    "todayVisits": 152,
    "totalVisits": 4021,
    "totalExtractions": 9830,
    "totalDownloads": 6112
  }
}
```

---

### `POST /api/web/extract` and `POST /api/v1/extract`

Extract metadata and media sources from a URL.

Request body:

```json
{
  "url": "https://www.instagram.com/reel/xxxx/",
  "cookie": "sessionid=...; csrftoken=..."
}
```

Notes:

- `url` is required and must be `http/https`.
- `cookie` is optional and used for private/restricted content.

Example cURL:

```bash
curl -X POST "http://localhost:8080/api/v1/extract" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/reel/xxxx/"}'
```

Example success response shape:

```json
{
  "success": true,
  "data": {
    "platform": "instagram",
    "result": {
      "id": "...",
      "title": "...",
      "thumbnail": "https://...",
      "items": [
        {
          "type": "video",
          "sources": [
            {
              "quality": "720p",
              "url": "https://..."
            }
          ]
        }
      ]
    }
  }
}
```

`result` follows the active extractor (native/fallback), so detailed fields may vary by platform.

---

### `GET /api/web/proxy` and `GET /api/v1/proxy`

Proxy media streams to reduce CORS issues and support `Range` requests.

Query params:

- `url` (required): direct media URL
- `head=1` (optional): HEAD-only metadata mode
- `download=1` (optional): marks download counter for stats

Stream example:

```bash
curl "http://localhost:8080/api/v1/proxy?url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4"
```

Head-only example:

```bash
curl -i "http://localhost:8080/api/v1/proxy?url=https%3A%2F%2Fcdn.example.com%2Fvideo.mp4&head=1"
```

Important behavior:

- Forwards `Range` headers for video seek.
- Enforces file size limits via `max_download_size_mb`.
- Sets headers such as `Content-Type`, `Content-Length`, `ETag`, `Last-Modified`, and `Accept-Ranges`.

---

### `POST /api/web/merge` and `POST /api/v1/merge`

YouTube fast-path merge and audio extraction using `yt-dlp` + FFmpeg only (no manual URL fallback).

Request body:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "quality": "1080p",
  "format": "mp4",
  "filename": "result.mp4",
  "userAgent": "Mozilla/5.0 ..."
}
```

Required fields:

- `url` (YouTube URL)

Optional fields:

- `quality` (for example: `1080p`, `720p`)
- `format` (`mp4` for video output, `mp3`/`m4a` for audio-only output)
- `filename`
- `userAgent`

Success response:

- Video mode: `200 OK`, `Content-Type: video/mp4`, merged binary stream.
- Audio mode (`format=mp3|m4a`): `200 OK`, audio stream with matching content type.
- `Content-Disposition` always uses the resolved filename.

Examples:

```bash
# Video merge (fast-path)
curl -X POST "http://localhost:8080/api/v1/merge" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","quality":"1080p","format":"mp4"}'

# Audio-only (MP3)
curl -X POST "http://localhost:8080/api/v1/merge" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","format":"mp3","filename":"track.mp3"}'
```

## Error Codes (Current)

| Code | HTTP | Description |
|---|---:|---|
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `INVALID_URL` | 400 | URL is invalid or empty |
| `INVALID_SOURCE` | 400 | Source URL is invalid for processing |
| `MISSING_PARAMS` | 400 | Required parameters are missing |
| `METHOD_NOT_ALLOWED` | 405 | Method is not allowed for route |
| `NOT_FOUND` | 404 | Route not found |
| `ORIGIN_NOT_ALLOWED` | 403 | Origin is not allowed (`/api/web/*`) |
| `ACCESS_DENIED` | 403 | Rejected by anti-bot/middleware |
| `UNSUPPORTED_PLATFORM` | 500 | Platform is not supported by current extractor |
| `NO_MEDIA_FOUND` | 422 | No extractable media found |
| `UPSTREAM_TIMEOUT` | 504 | Upstream platform timed out |
| `UPSTREAM_RATE_LIMITED` | 429 | Upstream platform rate-limited request |
| `UPSTREAM_FORBIDDEN` | 403 | Upstream rejected request (403) |
| `UPSTREAM_ERROR` | 502 | Generic upstream error |
| `PROXY_FAILED` | 502 | Proxy operation failed |
| `FILE_TOO_LARGE` | 413 | File size exceeds configured limit |
| `FFMPEG_UNAVAILABLE` | 503 | FFmpeg is unavailable |
| `MERGE_FAILED` | 500 | Merge operation failed |

## Non-Active Endpoints (Important)

These legacy status endpoints are not active and must not be treated as available:

- `/api/v1/status`
- `/api/v1/public/status`

Use `GET /health` for health checks and `GET /api/v1/stats/public` for public stats.
