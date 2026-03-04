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
- Weibo (native Go extractor)

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
# Development server on port 3001 (uses Turbopack)
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
go build -o downaria-api ./cmd/server    # Build binary

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
  - `native/` - Native Go extractors (Facebook, Instagram, Threads, Twitter, TikTok, Pixiv, Weibo)
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

The frontend uses Next.js 16 App Router with React 19 and a Backend-for-Frontend pattern. The development server uses Turbopack.

**Key Directories:**
- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/web/` - BFF gateway routes (extract, proxy, download, merge)
- `src/features/` - Feature-slice modules (see Feature-Slice Architecture below)
- `src/components/` - Shared React components organized by domain:
  - `core/` - App-level infrastructure components (ServiceWorkerRegister, IntlProvider, SeasonalEffects, etc.)
  - `docs/` - Documentation page components
  - `layout/` - Page layout components
  - `ui/` - Generic, reusable UI primitives (Button, Card, Input, Modal, Icons, LazyMarkdown, etc.)
- `src/lib/` - Core libraries:
  - `api/` - API client with Zod schemas
  - `storage/` - IndexedDB wrapper, client cache, settings, crypto utilities
  - `errors/` - Error codes and handlers
  - `contexts/` - React contexts
  - `stores/` - State management
  - `swr/` - SWR configuration
  - `utils/` - Shared utilities (see `cn()` below)
- `src/hooks/` - Custom React hooks (useMediaExtraction, useScraperCache, useDownloadSync, useRateLimitState)
- `src/i18n/` - Internationalization with next-intl

**BFF Gateway Pattern:**
- Frontend makes requests to local `/api/web/*` routes
- These routes sign requests with HMAC signatures (see `src/app/api/web/_internal/signature.ts`)
- Signed requests are forwarded to backend API
- Signature includes: method, path, timestamp, nonce, body hash

**Path Alias:** `@/*` maps to `./src/*` (configured in tsconfig.json and vitest.config.ts)

### Feature-Slice Architecture

Domain-specific components have been migrated from a flat `src/components/` structure into a modular `src/features/` directory. Each feature slice contains a `components/` directory and an `index.ts` barrel export.

**`src/features/downloader/`** - URL input, extraction flow, history, and public stats
- `DownloadForm` - URL input form and extraction trigger
- `DownloadPreview` - Result display after extraction
- `HistoryList` - Local download history
- `PublicStats` - Public platform stats display

**`src/features/media/`** - Media viewing and download management
- `MediaGallery` - Grid display of extracted media items
- `FormatSelector` - Quality/format picker
- `EngagementDisplay` - Like/view/share count display
- `DownloadProgress` - Per-item download progress indicator
- `VideoPreview` - Vidstack-based video player (see Vidstack Player below)

**`src/features/settings/`** - User-configurable settings panels
- `DiscordWebhookSettings` - Discord webhook configuration
- `SeasonalSettings` - Seasonal effect toggle

Import from the barrel exports, not from component paths directly:

```ts
import { DownloadForm, HistoryList } from '@/features/downloader';
import { VideoPreview, MediaGallery } from '@/features/media';
import { DiscordWebhookSettings } from '@/features/settings';
```

### Icon System

Icons are defined in `src/components/ui/Icons.tsx`. The project uses two tiers:

**lucide-react** for generic UI icons (Video, Image, Music, Film, Download, Globe, Clock, Zap, Layers, Lock, ShieldHalf, CheckCircle2, Lightbulb, Wand2, etc.). These are re-exported as named wrappers (e.g., `VideoIcon`, `DownloadIcon`, `BoltIcon`).

**Custom inline SVG brand icons** for social platforms, because lucide-react does not include brand logos. These are minimal hand-crafted SVG components that match the official brand shapes:
- `FacebookIcon`
- `InstagramIcon`
- `XTwitterIcon`
- `TiktokIcon`
- `WeiboIcon`
- `YoutubeIcon`

All icons accept an optional `className` prop and use `fill="currentColor"` so they respect CSS color. The `@fortawesome/*` packages have been removed entirely.

### Toast / Notification System

**Sonner** (`sonner` package) is the primary toast library. A single `<Toaster>` instance is mounted in `src/app/layout.tsx` at `position="bottom-right"` with CSS variable-driven theming:

```tsx
<Toaster
  position="bottom-right"
  toastOptions={{
    style: {
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
    },
  }}
/>
```

Use `toast()`, `toast.success()`, `toast.error()`, etc. from `sonner` for all informational, success, and error notifications.

**SweetAlert2** (`sweetalert2`) is kept as a lazy-loaded dependency (`lazySwal`) for destructive confirmation dialogs only (e.g., "Clear all history?", "Delete item?"). Do not use SweetAlert2 for general notifications — use Sonner instead.

### LazyMarkdown Component

Markdown rendering is split into two files to keep the markdown parser out of the initial bundle:

- `src/components/ui/MarkdownRenderer.tsx` - The actual renderer. Uses `react-markdown` with the `remark-gfm` plugin for GitHub Flavored Markdown (tables, strikethrough, task lists, etc.).
- `src/components/ui/LazyMarkdown.tsx` - A `next/dynamic` wrapper that lazy-loads `MarkdownRenderer` with a pulse skeleton placeholder.

Import `LazyMarkdown` (not `MarkdownRenderer`) in page/feature components:

```tsx
import { LazyMarkdown } from '@/components/ui/LazyMarkdown';

<LazyMarkdown>{markdownString}</LazyMarkdown>
```

### Vidstack Video Player

`src/features/media/components/VideoPreview.tsx` wraps the Vidstack v1.12.13 player (`@vidstack/react`) for direct (non-HLS) video playback.

**Props:** `src`, `posterUrl?`, `autoPlay?`, `className?`, `onEnded?`

Key details:
- Imports base styles from `@vidstack/react/player/styles/base.css`
- Uses `MediaPlayer` + `MediaProvider` + optional `Poster`
- Proper cleanup on unmount via ref nullification
- HLS streams are handled separately by `hls.js` in the existing media components; `VideoPreview` is for direct MP4/WebM URLs

### `cn()` Utility

`src/lib/utils/cn.ts` provides a `cn()` helper that combines `clsx` (conditional class logic) with `tailwind-merge` (deduplication of conflicting Tailwind classes):

```ts
import { cn } from '@/lib/utils/cn';

<div className={cn('base-class', isActive && 'active-class', className)} />
```

Use `cn()` for all dynamic className composition in components instead of string concatenation or manual merging.

### CSS and Styling

- **Tailwind v4** is used (`tailwindcss@^4`, `@tailwindcss/postcss@^4`). Configuration follows the Tailwind v4 conventions (no `tailwind.config.js` file; config lives in CSS).
- `src/app/globals.css` defines CSS custom properties for theming (`--bg-primary`, `--bg-card`, `--text-primary`, `--border-color`, etc.) used throughout components.
- Approximately 34 unnecessary `!important` declarations were removed from `globals.css` during the modernization. Avoid adding `!important` unless there is a specific, documented reason.
- The default font is **JetBrains Mono** (loaded via `next/font/google`).

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
- Test files: `*.test.ts`, `*.test.tsx`
- Run: `npm run test` in DownAria directory

**Backend:**
- Uses Go's built-in testing framework
- Test files: `*_test.go`
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

## Frontend Dependencies

**Runtime packages (key ones):**
| Package | Version | Purpose |
|---|---|---|
| `next` | ^16.1.6 | Framework + App Router |
| `react` / `react-dom` | 19.2.1 | React 19 |
| `lucide-react` | ^0.561.0 | UI icons |
| `sonner` | ^2.0.7 | Toast notifications |
| `sweetalert2` | ^11.26.10 | Destructive confirmations only |
| `@vidstack/react` | ^1.12.13 | Video player |
| `hls.js` | ^1.6.15 | HLS stream playback |
| `clsx` | ^2.1.1 | Conditional class names |
| `tailwind-merge` | ^3.5.0 | Tailwind class deduplication |
| `react-markdown` | ^10.1.0 | Markdown rendering |
| `remark-gfm` | ^4.0.1 | GFM plugin for react-markdown |
| `next-intl` | ^4.6.1 | i18n / locale routing |
| `swr` | ^2.3.8 | Data fetching / caching |
| `zod` | ^3.25.76 | Schema validation |
| `framer-motion` | ^12.23.26 | Animations |
| `jszip` | ^3.10.1 | ZIP archive creation |
| `@vercel/analytics` | ^1.6.1 | Vercel Analytics (prod only) |
| `@vercel/speed-insights` | ^1.3.1 | Vercel Speed Insights (prod only) |

**Removed packages (do not re-add):**
- `@fortawesome/fontawesome-svg-core`
- `@fortawesome/free-brands-svg-icons`
- `@fortawesome/free-solid-svg-icons`
- `@fortawesome/react-fontawesome`

All FontAwesome usage has been replaced by `lucide-react` and custom SVG brand icons in `src/components/ui/Icons.tsx`.

**Dev packages (key ones):**
- `tailwindcss@^4` + `@tailwindcss/postcss@^4` - Tailwind v4
- `vitest@^2.1.9` + `@testing-library/react@^16` + `jsdom@^28` - Testing
- `typescript@^5` - TypeScript
- `babel-plugin-react-compiler@1.0.0` - React compiler Babel plugin

**Backend (DownAria-API):**
- Go 1.24+
- **FFmpeg** (required for `/api/web/merge` and `/api/v1/merge` routes)
- yt-dlp (for YouTube extraction)

## Important Notes

### Frontend
- Service worker timestamp is auto-updated during prebuild
- CHANGELOG.md is copied to public/ during prebuild for docs page
- Uses IndexedDB for history/cache, localStorage for settings
- i18n with next-intl (locale routing)
- PWA-enabled with manifest and service worker
- React 19 with React Compiler (Babel plugin configured)
- Turbopack is used in development (`next dev` automatically uses it in Next.js 16)
- Sonner `<Toaster>` is the single notification provider — do not add another
- Use `cn()` from `@/lib/utils/cn` for all dynamic className composition
- Import feature components from barrel exports (`@/features/downloader`, `@/features/media`, `@/features/settings`)

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
docker build -t downaria-api:latest .

# Run container
docker run --rm -p 8080:8080 --env-file .env downaria-api:latest
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
- Vercel Analytics and Speed Insights are enabled only in production Vercel environments (`IS_PROD && IS_VERCEL`)

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
- **FontAwesome**: The `@fortawesome/*` packages are removed. Use `lucide-react` for UI icons and the custom SVG components in `src/components/ui/Icons.tsx` for brand icons
- **SweetAlert2 scope**: Only use `lazySwal` for destructive confirmations. All other notifications must use `sonner`
- **Tailwind !important**: Do not add `!important` to Tailwind/CSS rules without a documented reason; ~34 were removed during modernization
- **Feature imports**: Import from the feature barrel (`@/features/downloader`) not from the component file path directly
