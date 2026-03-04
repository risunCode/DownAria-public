# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DownAria is a media extraction and download platform with a Next.js frontend and Go backend API. The project supports multiple social media platforms with a unified response format.

**Repository Structure:**
- `DownAria/` - Next.js 16 frontend (port 3001)
- `DownAria-API/` - Go 1.24 backend API (port 8081)
- `dev.cmd` - Development launcher for both services

Both directories are separate git repositories.

**Supported Platforms:**
- YouTube (via yt-dlp wrapper)
- Instagram (native Go extractor)
- Twitter/X (native Go extractor)
- TikTok (native Go extractor)
- Facebook (native Go extractor)
- Pixiv (native Go extractor)
- Threads (native Go extractor)

**Key Features:**
- Multi-platform media extraction with unified response format
- Preview/stream and download flows with proxy support
- Video+audio merge capability (requires FFmpeg)
- HLS playlist rewriting for streaming
- Rate limiting with retry metadata
- Extraction result caching with configurable TTL
- Optional file-backed stats persistence

## Development Commands

### Running the Full Stack

```bash
# Windows: Launch both frontend and backend with live reload
dev.cmd

# Manual startup:
# Terminal 1 - Backend (with Air live reload)
cd DownAria-API
go run github.com/air-verse/air@latest -c .air.toml

# Terminal 2 - Frontend
cd DownAria
npm run dev
```

### Frontend (DownAria/)

```bash
# Development server on port 3001
npm run dev

# Production build (runs prebuild scripts: update-sw-version, copy-changelog)
npm run build

# Start production server
npm run start

# Linting
npm run lint

# Run tests (Vitest)
npm run test
```

### Backend (DownAria-API/)

```bash
# Development
go run ./cmd/server                                    # Run server directly
go run github.com/air-verse/air@latest -c .air.toml   # Run with live reload

# Building
go build -o fetchmoona ./cmd/server    # Build binary

# Testing
go test ./...                          # Run all tests
go test ./... -v                       # Verbose output
go test ./internal/app/services/...    # Test specific package
```

## Architecture

### Backend (Go) - Clean Architecture

The backend follows a layered architecture with clear separation of concerns:

**Layer Structure:**
- `internal/core/` - Domain contracts, interfaces, configuration, error codes
- `internal/extractors/` - Platform-specific extraction logic (registry pattern)
  - `native/` - Native Go extractors (Facebook, Instagram, Threads, Twitter, TikTok, Pixiv)
  - `aria-extended/` - yt-dlp wrapper for YouTube
  - `registry/` - Registry pattern for URL-to-extractor matching
- `internal/app/services/` - Application services and use case orchestration
- `internal/infra/` - Infrastructure implementations (cache, network, persistence)
- `internal/transport/http/` - HTTP handlers, middleware, routing
- `pkg/` - Reusable packages (ffmpeg, media utilities, response builders)

**Key Patterns:**
- **Extractor Registry**: URL patterns are matched against registered extractors using regex. Each extractor implements the `core.Extractor` interface.
- **Middleware Chain**: Applied in reverse order in `internal/app/app.go` - CORS, RequestID, StructuredLogging, RateLimit, RouteRateLimit
- **Signed Gateway Routes**: `/api/web/*` routes require HMAC signature verification using `WEB_INTERNAL_SHARED_SECRET`
- **Dual Route System**:
  - `/api/web/*` - Protected routes for frontend (requires signature)
  - `/api/v1/*` - Public API routes
  - `/api/v1/merge` only registered when `WEB_INTERNAL_SHARED_SECRET` is empty (production uses signed `/api/web/merge`)

**Entry Point:** `cmd/server/main.go` loads environment variables from `.env.local` and `.env`, validates `WEB_INTERNAL_SHARED_SECRET`, and starts the application.

### Frontend (Next.js) - BFF Pattern

The frontend uses Next.js 16 App Router with a Backend-for-Frontend pattern:

**Key Directories:**
- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/web/` - BFF gateway routes (extract, proxy, download, merge)
- `src/components/` - React components organized by domain (core, docs, download, layout, media, settings, ui)
- `src/lib/` - Core libraries:
  - `api/` - API client with Zod schemas
  - `storage/` - IndexedDB wrapper, client cache, settings, crypto utilities
  - `errors/` - Error codes and handlers
  - `contexts/` - React contexts
  - `stores/` - State management
  - `swr/` - SWR configuration
- `src/hooks/` - Custom React hooks (useMediaExtraction, useScraperCache, useDownloadSync, useRateLimitState)
- `src/i18n/` - Internationalization with next-intl

**BFF Gateway Pattern:**
- Frontend makes requests to local `/api/web/*` routes
- These routes sign requests with HMAC signatures (see `src/app/api/web/_internal/signature.ts`)
- Signed requests are forwarded to backend API
- Signature includes: method, path, timestamp, nonce, body hash

**Path Alias:** `@/*` maps to `./src/*` (configured in tsconfig.json and vitest.config.ts)

### Security Architecture

**Request Signing:**
- Frontend generates HMAC-SHA256 signatures for `/api/web/*` requests
- Canonical string format: `METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY_HASH`
- Headers: `X-Downaria-Timestamp`, `X-Downaria-Nonce`, `X-Downaria-Signature`
- Backend validates signatures in `internal/transport/http/middleware/web_signature.go`

**Security Headers:**
- CSP configured in `next.config.ts` with strict directives
- X-Frame-Options, X-Content-Type-Options, HSTS, etc.

**Rate Limiting:**
- Global IP-based rate limiting with configurable window/limit
- Separate stricter limits for merge routes (1/3 of global limit)
- Trusted proxy CIDR support for accurate client IP extraction

## Environment Configuration

Both services require `.env.local` or `.env` files. See `.env.example` in each directory.

**Critical shared variables:**
- `WEB_INTERNAL_SHARED_SECRET` - Must match between frontend and backend (required for backend startup)
- `NEXT_PUBLIC_API_URL` - Frontend's backend API URL (e.g., `http://localhost:8081`)
- `ALLOWED_ORIGINS` - Backend CORS origins (e.g., `http://localhost:3001`)

**Frontend-specific:**
- `NEXT_PUBLIC_APP_URL` - Frontend origin for signature context
- `NEXT_PUBLIC_BASE_URL` - Canonical public URL for metadata
- `FEEDBACK_DISCORD_WEBHOOK_URL` - Discord webhook for feedback API

**Backend-specific:**
- `PORT` - Server port (default: 8080, dev: 8081)
- `PUBLIC_BASE_URL` - Backend public URL
- `UPSTREAM_TIMEOUT_MS` - Timeout for upstream requests (default: 10000)
- `GLOBAL_RATE_LIMIT_WINDOW` - Rate limit config (e.g., `60/1m`)
- `MAX_DOWNLOAD_SIZE_MB` - Max proxied file size (default: 1024)
- `STATS_PERSIST_ENABLED` - Enable file-backed stats (default: false)
- `EXTRACTION_MAX_RETRIES` - Retry attempts for transient failures (default: 3)
- `CACHE_EXTRACTION_TTL` - Extraction cache TTL (default: 5m)

**Frontend reads:** `.env.local` (automatically loaded by Next.js)
**Backend reads:** `.env.local`, `.env` (loaded via godotenv in main.go)

## Testing

**Frontend:**
- Uses Vitest with jsdom environment
- Test files: `*.test.ts`, `*.test.tsx` (169 test files)
- Run: `npm run test` in DownAria directory

**Backend:**
- Uses Go's built-in testing framework
- Test files: `*_test.go` (28 test files)
- Run: `go test ./...` in DownAria-API directory
- Integration tests in `internal/extractors/extractor_integration_test.go`

## Important Conventions

**Error Handling:**
- Backend uses categorized errors with stable error codes (see `internal/core/errors/codes.go`)
- Categories: `VALIDATION`, `NETWORK`, `RATE_LIMIT`, `AUTH`, `NOT_FOUND`, `EXTRACTION_FAILED`
- Rate-limit responses include `Retry-After` header and metadata with `retryAfter` + `resetAt`
- Frontend maps backend errors to user-friendly messages (see `src/lib/errors/`)

**Caching:**
- Backend: TTL-based cache for extraction results and proxy metadata
- Frontend: IndexedDB for history, settings, and content cache
- Extraction cache TTL controlled by `CACHE_EXTRACTION_TTL` environment variable

**Stats Persistence:**
- Backend can persist public stats to file (`STATS_PERSIST_ENABLED=true`)
- Buffered writes with configurable flush interval and threshold
- File path: `./data/public_stats.json` (default)

**Stats Persistence:**
- Backend can persist public stats to file (`STATS_PERSIST_ENABLED=true`)
- Buffered writes with configurable flush interval and threshold
- File path: `./data/public_stats.json` (default)

**Prebuild Scripts:**
- `scripts/update-sw-version.js` - Updates service worker build timestamp
- `scripts/copy-changelog.js` - Copies root `CHANGELOG.md` to `public/Changelog.md`

## Working with Extractors

When adding or modifying platform extractors:

1. Implement the `core.Extractor` interface in `internal/extractors/native/<platform>/`
2. Register URL patterns in `internal/extractors/registry/patterns.go`
3. Add factory function to registry in extractor initialization
4. Return unified response format (see `internal/extractors/core/types.go`)
5. Handle authentication if required (cookies, tokens)
6. Add tests in `<platform>/extractor_test.go`

## Important Notes

### Frontend
- Service worker timestamp is auto-updated during prebuild
- CHANGELOG.md is copied to public/ during prebuild for docs page
- Uses IndexedDB for history/cache, localStorage for settings
- i18n with next-intl (locale routing)
- PWA-enabled with manifest and service worker

### Backend
- **Requires `WEB_INTERNAL_SHARED_SECRET` to start** - will exit if missing
- Uses godotenv to load `.env.local` and `.env` automatically
- Graceful shutdown with 10-second timeout
- Supports both native extractors (Go) and extended extractor (yt-dlp)
- Rate limiting is IP-based with configurable buckets and TTL
- Stats persistence is optional and uses atomic file writes

### Merge Functionality
- Supports two modes: YouTube URL fast-path and direct `videoUrl+audioUrl` pair
- Frontend uses direct pair mode for HLS and split streams
- Requires FFmpeg binary available in PATH
- Output size limited by `MAX_MERGE_OUTPUT_SIZE_MB`

## Deployment

### Docker (Backend)

```bash
cd DownAria-API

# Build image
docker build -t fetchmoona:latest .

# Run container
docker run --rm -p 8080:8080 --env-file .env fetchmoona:latest
```

**Requirements:**
- FFmpeg must be available in container PATH for merge functionality
- Set `WEB_INTERNAL_SHARED_SECRET` in environment
- Configure `ALLOWED_ORIGINS` for CORS
- Health check endpoint: `GET /health`

### Railway

Both projects include deployment configurations:
- **DownAria-API**: `railway.toml` for Dockerfile deployment
- **DownAria**: Standard Next.js deployment

See `DownAria-API/Documentation/DEPLOYMENT.md` for production environment recommendations.

### Vercel (Frontend)

- Vercel deployment configured via `vercel.json`
- PWA support with service worker in `public/sw.js`

## Dependencies

**Backend (DownAria-API):**
- Go 1.24+
- **FFmpeg** (required for `/api/web/merge` and `/api/v1/merge` routes)
- yt-dlp (for YouTube extraction)

**Frontend (DownAria):**
- Node.js (compatible with Next.js 16)
- npm

## Documentation

Additional documentation in each project:
- **DownAria/Documentation/**: API_Routes.md, Architecture.md, Env_Variables.md
- **DownAria-API/Documentation/**: API_Routes.md, Architecture.md, ERROR_CODES.md, ERROR_HANDLING.md, CONFIGURATION.md, DEPLOYMENT.md

## Common Pitfalls

- **Missing WEB_INTERNAL_SHARED_SECRET**: Backend will exit immediately if this is not set
- **CORS Issues**: Ensure `ALLOWED_ORIGINS` includes your frontend URL
- **Port Conflicts**: Frontend uses 3001, backend uses 8081 by default
- **Path Aliases**: Use `@/` prefix for imports in frontend (not relative paths)
- **Rate Limiting**: Merge routes have stricter limits (1/3 of global limit)
- **Signature Timing**: Frontend signatures include timestamp - ensure system clocks are synchronized
