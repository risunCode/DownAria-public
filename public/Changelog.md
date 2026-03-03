# Changelog

All notable changes to DownAria will be documented in this file.

## [2.1.0] - 2026-03-01

### 🚀 Project Revived New DownAria 2.1 

#### 📦 New Features
- Full Documentation Hub at `/docs` with new pages: Overview, API, FAQ, and Changelog
- New `/docs/api` reference page with:
  - endpoint groups (GET/POST)
  - canonical error categories and handling rules
  - expandable Error Codes section
  - request examples (cURL, PowerShell, JavaScript)
  - response JSON examples (Success/Error)
- New macOS-style documentation panels (traffic lights) for request/response examples
- Convert to Audio now supported by default
- Rate Limit UX flow added with dedicated modal + live countdown + reset-aware retry state
- New `Credits` page with full acknowledgements and technology stack details
- Added Credits cards/links into About and Docs quick links

#### 🔧 Improvements
- Prebuild script now auto-copies `CHANGELOG.md` from root to `public/` for the changelog page
- Settings page restructured into tabs: Basic, Cookies, Integrations, Storage
- New reusable UI components: Accessibility, SplitButton, Slider, Skeleton
- MediaGallery component for multi-image carousel display
- DownloadProgress component with real-time progress tracking
- CacheInitializer for faster repeated fetches
- ThemeColorMeta auto-updates browser theme color based on active theme
- Sidebar platform list now reflects real supported platforms (including Pixiv)
- Sidebar cleanup: removed non-essential footer tagline for cleaner UI
- About page refresh:
  - improved quick links copy
  - API Docs moved to quick links (`/docs`)
  - More Projects cards updated and linked directly to repository pages
  - footer branding updated to dynamic year + GPL-3 license text
- Privacy page fully redesigned to match About style system:
  - glass-card layout and responsive sections
  - clearer cookie/privacy explanation
  - retention/deletion, security, and FAQ sections
  - quick links moved to bottom for better reading flow
- Docs Overview and Docs API mobile UX overhaul:
  - better spacing/typography on small screens
  - responsive card grids
  - horizontal-scroll docs navbar for compact devices
  - improved checklist numbering and visual hierarchy

#### 🧠 Backend & API Behavior Improvements
- Facebook extraction logic improved:
  - fallback parsing for views/likes from title patterns (e.g. `83K views`, `1.3K reactions`)
  - title cleanup to remove noisy stats prefixes and trailing author suffixes
  - unicode escape decoding for author/title/description text
- Author mapping improved end-to-end:
  - backend now emits cleaner author text
  - frontend fallback chain avoids false `Unknown` when name exists
- Cookie lane flow standardized and documented:
  - `Guest -> Server -> UserProvided`
  - lane escalation only on auth-related failures
  - `meta.cookieSource` exposed as `guest | server | userProvided`
- Error handling normalization improved:
  - canonical error codes emphasized in API docs
  - upstream-specific causes preserved through metadata (`causeCode`) when normalized
- Response docs aligned with current v1 behavior only (no version split)

#### 🐛 Fixed
- Service Worker cache invalidation now more reliable with timestamped `BUILD_TIME`
- Duplicate key warning in `/docs/api` endpoint cards (`POST-/api/v1/merge`)
- Multiple docs consistency issues (v1 naming, endpoint ordering, duplicate code entries)
- Mobile layout issues across docs cards and checklist sections
- Base URL display now reads `NEXT_PUBLIC_API_URL` and hides explicit port in UI presentation

### 🔄 Additional 2.1.0 Updates (Merged)

#### 📦 New User Features
- Added **History Refetch** action (`RotateCcw`) so users can reopen any history item on Home and instantly re-extract it.
- Added Home auto-refetch flow via query params (`refetch`, `refetchPlatform`, `refetchTs`) with automatic URL cleanup after extraction.
- Added **ScreenSizeGuard** viewport warning modal for unsupported mobile overflow cases.

#### 🔧 Improvements
- Improved docs/about/privacy/credits card contrast using `docs-surface` + nested hover card styling for better readability in light/solarized/custom backgrounds.
- Improved modal theming consistency with new palette tokens and themed titlebar/backdrop behavior.
- Improved format selection and audio conversion UX by moving conversion options into the selector and tightening synthetic audio-option rules.
- Improved merge/download error handling so UI surfaces readable messages instead of raw object output.
- Updated Settings wording from `Blur` to `Background Blur` for clearer controls.
- Standardized media size source to backend JSON `filesize`; frontend HEAD probing removed from preview/gallery flows.
- Updated merge request/response handling to align with current backend endpoint contract (`url + quality/format`).
- Updated docs and implementation references so API usage reflects actual runtime behavior.

#### 🧠 Backend & API Behavior Improvements
- Improved merge pipeline with yt-dlp URL resolution + ffmpeg fast-path, replacing fragile manual split-URL merge behavior.
- Improved extraction metadata by enriching backend-provided `filesize` across supported platforms.
- Improved download stability by relying on finalized backend stream/spool behavior for more deterministic progress and content length.

#### 🐛 Fixed
- Fixed settings toggle mismatch: `backgroundEnabled` now correctly controls SeasonalEffects visibility.
- Fixed over-bright changelog/docs interactive surfaces caused by overly broad selector targeting.
- Fixed Twitter/X format classification edge cases that incorrectly pushed valid video options into audio-only behavior.
- Fixed Home/History responsive overflow edge cases (history card layout + mobile spacing), reducing false viewport-warning triggers.

### 🔄 Additional 2.1.0 Updates (UI/UX + Runtime)

#### 🔧 Improvements
- History action buttons (Refetch/Copy/Open/Delete) now use clearer visual emphasis without changing overall card layout.
- Experimental settings updated:
  - `Zoom` label renamed to `Background Zoom`
  - added `Move Background (Up/Down)` slider control
  - fixed background sound sync to read from seasonal settings source of truth.
- Docs breadcrumb (`Docs / ...`) restyled with adaptive surface for better visibility on custom backgrounds.
- About/Privacy/Credits cards and About feedback form surfaces were re-adapted to reduce milky/washed appearance on dark custom backgrounds.
- Error action navigation (`Open Settings`, `Go Home`) now uses client routing for smoother transitions.

#### 🧠 Backend & Config Improvements
- Global IP rate limit standardized via `GLOBAL_RATE_LIMIT_WINDOW` (`<limit>/<window>` format, example `200/4min`).
- Removed legacy/fallback rate-limit and guest-scoped env variants in active config flow.
- Cache configuration simplified to global keys:
  - `CACHE_EXTRACTION_TTL`
  - `CACHE_PROXY_HEAD_TTL`
  (platform-specific extraction TTL env keys removed).
- Server-side optional cookie-lane env keys were removed from active configuration path.
- Merge download filename normalization now strips trailing quality labels (`HD/SD/Audio/Original`) from attachment names.

#### 🐛 Fixed
- Fixed docs changelog hydration mismatch caused by invalid/unpaired Unicode code points in parsed changelog text.
- Fixed Next.js build prerender failure on `/` by wrapping `useSearchParams()` usage in a required `Suspense` boundary.

---

## [0x1] - 2025-12-30 Project History

### All changelog History can be found here > old_changelog.md

## Version History
- [2.0.0] - 2025-12-30 > New Platforms (yt-dlp + gallery-dl based)
- [1.9.0] - 2025-12-28 > Performance Improvements 
- [1.7.0] - 2025-12-25 > Telegram Bot Integration 
- [1.6.0] - 2025-12-25 > Rebranding: XTFetch → DownAria 
- [1.4.0] - December 23, 2025
- [1.3.0_v0] - December 23, 2025  
- [1.2.0] - December 21, 2025 
- [1.0.5] - December 20, 2025 
- [1.0.4] - December 15, 2025
- [1.0.3] - December 10, 2025 
- [1.0.2] - December 8, 2025 
- [1.0.1] - December 5, 2025 
- [1.0.0] - November 25, 2025 (Initial Release XTFetch)
