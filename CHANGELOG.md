# Changelog

All notable changes to this project will be documented in this file.

## [2.5.0] - 2026-04-09

### 🧹 Frontend Cleanup Foundation

#### ✨ Improved
- Reorganized the frontend into clearer `app`, `modules`, `shared`, and `infra` boundaries.
- Simplified settings and seasonal controls into smaller owned surfaces with stronger module boundaries.
- Improved homepage SEO and brand-first metadata for DownAria.
- Switched the app-wide font system to Outfit for a more consistent visual identity.
- Added platform-focused SEO landing pages for Facebook, Instagram, TikTok, Twitter, YouTube, and Pixiv with stronger internal linking and sitemap coverage.
- Strengthened downloader input handling with a unified parser, stronger URL normalization, better bare-domain support, and more predictable paste behavior.
- Added shared runtime, security, and SEO helpers while compacting small files to keep the codebase easier to manage.

#### 🗑️ Removed
- Removed the legacy frontend API and gateway layer from the web app.
- Removed stale downloader/runtime leftovers, unused helpers, and old dead code paths.
- Removed outdated references to legacy API routes, changelog drift, and inconsistent product copy.

#### 🔧 Fixed
- Fixed stale UI copy and metadata that no longer matched the current frontend runtime.
- Fixed logging behavior so recoverable client-side failures stay quieter outside development.
- Fixed storage and seasonal correctness with additional targeted tests for settings and seasonal behavior.
- Fixed downloader form error handling with more precise unsupported-protocol and invalid-input feedback.
- Fixed failure handling around history, service worker, and seasonal runtime behavior to make the app more predictable under errors.

#### 🧪 Tested
- Added and expanded tests for downloader form behavior, maintenance UI, service worker refresh, history fallback, settings storage, and seasonal storage.
- Verified the app with TypeScript checks, the full Vitest suite, and a production build after the stabilization work.

#### 📦 Notes
- This release focuses on frontend stabilization and SEO preparation before backend integration with Backend.
- `public/Changelog.md` is generated from this file during prebuild.
- Changelog formatting is preserved for renderer compatibility.

## [2.6.0] - 2026-04-25

### 🚀 Backend Integration & API Modernization

#### ✨ Improved
- **Backend Media Proxy**: Migrated media streaming and thumbnail proxying to the Backend backend. This resolves IP-binding issues for YouTube playback and ensures consistent streaming performance.
- **Flattened JSON Schema**: Synchronized the frontend with Backend's new flat extraction schema, reducing nesting and improving response parsing efficiency.
- **Stream Profile Support**: Implemented support for the new `stream_profile` enum for more accurate media type and capability detection.
- **Enhanced Gallery Playback**: Improved YouTube 360p playback logic to match the public version, allowing direct playback for muxed progressive streams.
- **Refined Player UX**: Added overlay notices for non-progressive or non-supported playback formats with context-specific explanations.

#### 🚀 Reliability & Performance Improvements
- **Request Timeouts**: Added 30-second timeout to all fetch calls to prevent hanging requests.
- **Request Cancellation**: Implemented AbortController support for user-initiated download cancellation.
- **Concurrent Request Limiting**: Limited batch downloads to 5 concurrent requests to prevent browser overwhelm.
- **Exponential Backoff**: Replaced fixed 1.2s job polling with smart exponential backoff (1s → 2s → 4s → 8s → 15s max).
- **Circuit Breaker**: Added circuit breaker pattern for Backend API calls with CLOSED/OPEN/HALF_OPEN states (5 failure threshold, 30s timeout).
- **Retry Jitter**: Added ±25% random jitter to retry delays to prevent thundering herd problem.
- **Request Deduplication**: Implemented in-flight request tracking to prevent duplicate downloads.
- **Memory Safety**: Added 100MB threshold for large file downloads using streaming approach instead of memory accumulation.
- **Resource Cleanup**: Fixed timer leak in HomePage component and audited all useEffect cleanup handlers.
- **Connection Pooling**: Enabled HTTP keep-alive on all fetch calls for better connection reuse.

#### 🛡️ Fixed
- **Playback Sync**: Fixed a bug where switching resolutions in the Media Gallery wouldn't update the video source by adding unique keys to media elements.
- **YouTube Playability**: Resolved issues with YouTube videos not playing in the gallery due to IP-binding mismatches by routing playback through the backend proxy.

#### 🗑️ Removed
- **Legacy Frontend Proxy**: Removed the old frontend gateway layer while retaining a small same-origin `/api/proxy` media wrapper for browser playback compatibility.

#### 🧪 Tested
- Updated and verified the full Vitest suite, including `DownloadPreview` and `PreviewGallery` tests, to match the new API schema.
- Verified end-to-end extraction and playback flow with the new backend proxy.

---

## [2.5.1] - 2026-04-12

### 🧹 Frontend Cleanup Expansion (Stable)

#### ✨ Improved
- Refined downloader preview/gallery ownership by consolidating helpers, modals, and preview sections.
- Added SEO landing input flows that sanitize URLs and auto-submit into the dashboard.
- Clarified dashboard sections with lightweight headers and improved history access.
- Consolidated storage modules into clearer settings, theme, user, and cookies surfaces.
- Expanded docs with richer API usage guidance, dedicated error handling documentation, and more product-first overview copy.
- Improved mobile homepage stats layout and tightened docs responsiveness across overview, FAQ, API, and error pages.
- Added structured downloader error notice cards with action links into settings/cookies for private or auth-related failures.

#### 🛡️ Fixed
- Strengthened downloader error handling for non-JSON responses, network failures, and batch download progress.
- Hardened download job polling with JSON parsing retries and better status messaging.
- Improved backup/export error reporting and history import diagnostics.
- Updated offline handling and seasonal storage correctness after storage refactors.
- Hardened backend session bootstrap from the frontend bridge with a shared web bootstrap secret.
- Fixed backend error presentation so stable Backend error codes surface correctly in the DownAria UI.
- Improved mobile stats readability with denser cards and a persistent three-column layout.

#### 🧪 Tested
- Ran the full Vitest suite after the cleanup and storage restructuring.
- Verified the updated docs, downloader bridge session handling, and production build after the latest frontend hardening pass.
