# AGENTS.md

This repository is the DownAria frontend. (v2.6.1)
It is a Next.js 16 App Router app written in TypeScript with Tailwind CSS 4 and Vitest.
Use this file as the working contract for coding agents operating in this repo.

## Instruction Files
- Existing `AGENTS.md`: none was present before this file was added.
- Cursor rules: no `.cursorrules` file found.
- Cursor rules directory: no `.cursor/rules/` directory found.
- Copilot instructions: no `.github/copilot-instructions.md` file found.
- Result: there are no extra IDE-specific rule files to merge at the moment.

## Stack And Layout
- Package manager: `npm` (`package-lock.json` is committed).
- Framework: Next.js 16 with App Router.
- Language: TypeScript with `strict: true` in `tsconfig.json`.
- Styling: Tailwind CSS 4 plus large shared theme tokens in `src/app/globals.css`.
- Animation: Framer Motion.
- i18n: `next-intl` with locales in `src/i18n/config.ts` and messages in `src/i18n/messages/`.
- Validation: lightweight client-side validation helpers plus strict TypeScript.
- Tests: Vitest 4.
- Path alias: `@/*` maps to `src/*`.

## Important Paths
- `src/app/`: routes, layouts, metadata, global CSS.
- `src/app/api/`: thin Next.js proxy routes to Backend, including job polling/artifact/cancel routes.
- `src/proxy.ts`: Next.js 16 convention for Edge routing and request/response interception (replaces middleware.ts). Handles dynamic CSP nonce generation; keep this aligned with `next.config.ts` and `src/app/layout.tsx`.
- `src/modules/`: feature-owned UI, models, services, and page composition helpers.
- `src/modules/seo/`: SEO landing pages, content, and reusable discoverability sections.
- `src/shared/`: shared UI, layout, config, storage, and utility surfaces.
- `src/shared/runtime/`: shared logging and app event helpers.
- `src/shared/security/`: shared URL and input safety helpers.
- `src/shared/seo/`: shared metadata helpers.
- `src/components/`: remaining core app-wide components that have not been folded into `shared/`.
- `src/infra/`: lower-level implementation modules used behind shared/module surfaces.
- `src/i18n/messages/`: translation JSON files.
- `scripts/`: prebuild helper scripts.

## Current Download/Preview Architecture
- `src/modules/downloader/services/preview.ts` is a facade plus response mapping; keep format logic in `format-utils.ts`, filename logic in `filename-utils.ts`, and history persistence in `preview-history.ts`.
- `src/modules/downloader/services/download-client.ts` owns single-item download execution, async job polling, transient polling retries, backend job cancellation, and object URL revocation timing. Uses an idle watchdog (90s) for stream stability.
- `src/modules/downloader/services/batch-download.ts` owns sequential and ZIP batch flows.
  - ZIP downloads run in chunks of 5 concurrent item requests.
  - Async job polling retries transient `429`, `503`, and `504` responses before failing.
  - Batch user-facing progress strings must use `downloader.batch.*` i18n keys when a translator is passed.
- `src/modules/downloader/services/download-store.ts` owns task state and AbortController registration/cancellation.
- Shared object guards belong in `src/shared/utils/type-guards.ts`; do not reintroduce local `isRecord` helpers.

## Setup Commands
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Dev server port: `3001`
- Production build: `npm run build`
- Production start: `npm run start`

## Build, Lint, Typecheck, Test
- `npm run dev` starts Next dev on port `3001`.
- `npm run build` runs `prebuild` first, then `next build`.
- `npm run start` serves the production app on port `3001`.
- `npm run test` runs the full Vitest suite via `vitest run`.
- There is no dedicated `typecheck` script in `package.json`.
- Use `npx tsc --noEmit --pretty false` for TypeScript checking.
- There is a `lint` script, but no `eslint.config.*` or `.eslintrc*` file is present.
- Today, `npm run lint` fails immediately because ESLint 9 cannot find a config file.

## Verified Command Notes
- Verified working direct test command: `npm run test`
- Verified working direct Vitest form: `npx vitest run`
- Verified typecheck command: `npx tsc --noEmit --pretty false`
- Verified lint invocation exists but currently fails because the repo has no ESLint config.

## Single-Test Recipes
- Run one test file: `npm run test -- src/modules/settings/services/cookie-parser.test.ts`
- Run one React test file: `npm run test -- src/modules/downloader/components/DownloadForm.test.tsx`
- Run tests matching a name: `npm run test -- -t "shows a specific protocol error for unsupported URLs" src/modules/downloader/components/DownloadForm.test.tsx`
- Run Vitest in watch mode for one file: `npx vitest src/shared/utils/retry.test.ts`
- Run the entire suite with verbose local iteration: `npx vitest`

## Prebuild Behavior
- `npm run build` triggers `node scripts/update-sw-version.js`.
- The prebuild script updates `public/sw.js` and mirrors `CHANGELOG.md` into `public/Changelog.md`.
- Do not remove this script when changing the build unless the build pipeline is intentionally redesigned.

## Testing Conventions
- Test files are colocated with source and use `*.test.ts` or `*.test.tsx`.
- Default Vitest environment is `node` from `vitest.config.ts`.
- DOM-heavy tests opt into jsdom per file using `// @vitest-environment jsdom`.
- Current tests commonly use `vi.mock`, `vi.stubGlobal`, `vi.restoreAllMocks`, and `vi.unstubAllGlobals`.
- Keep tests deterministic; avoid real network calls.
- Prefer narrow unit tests close to the module under test.

## Imports And Module Boundaries
- Prefer `@/` imports for code under `src/`.
- Use relative imports for same-folder modules and tight local siblings, especially in tests.
- Order imports in this sequence when possible:
- Node built-ins.
- React / Next.
- Third-party packages.
- Internal `@/` modules.
- Relative modules.
- Separate logical groups with a blank line.
- Use `import type` for type-only imports when practical.
- Inline `type` specifiers are already used in the repo, for example `import { type HistoryEntry } ...`.

## Formatting Conventions
- TypeScript is not perfectly uniform across the repo; match the surrounding file first.
- Default to 2-space indentation in new TS/TSX unless the touched file clearly uses 4 spaces.
- Use semicolons in TS/TSX.
- Single quotes are the dominant style in most TS/TSX files.
- Some framework files use double quotes; preserve existing style inside heavily preformatted files.
- Keep lines readable rather than aggressively compressed.
- Avoid adding comments unless the logic is genuinely non-obvious.

## Naming Conventions
- React component filenames use PascalCase, for example `Button.tsx` and `DownloadPreview.tsx`.
- Hooks use camelCase filenames beginning with `use`, for example `useMediaExtraction.ts`.
- Utility and storage modules generally use lowercase or kebab-case filenames.
- Exported React components, classes, interfaces, and types use PascalCase.
- Functions, variables, and object keys use camelCase.
- Constant maps and enum-like objects use `SCREAMING_SNAKE_CASE` or PascalCase-with-`as const` depending on existing file style.
- Route handlers in App Router export uppercase HTTP functions like `GET` and `POST`.

## TypeScript Guidance
- Keep code compatible with `strict: true`.
- Prefer explicit interfaces or type aliases for object shapes passed across modules.
- Prefer `unknown` over `any` and narrow before use.
- Use unions for action objects and mode flags.
- Use `as const` for constant dictionaries such as error code maps and storage keys.
- Reuse shared types from `src/shared/types/`, `src/modules/media/`, and existing module models before inventing new ones.
- Prefer explicit mapping between legacy payload shapes and frontend-owned models when shape safety matters.
- Do not silently widen types just to satisfy TypeScript; fix the source typing instead.

## React And Next.js Conventions
- Add `'use client';` only when a component truly needs client features.
- Keep server-capable files server-side by default.
- App routes live under `src/app/` and follow App Router conventions.
- Use `Metadata` exports for page metadata when applicable.
- Prefer shared primitives in `src/shared/` and feature-owned pieces in `src/modules/`.
- Keep route files thin; move orchestration into module components/services when it simplifies page components.
- Use `Suspense`, `useMemo`, `useCallback`, and `useRef` intentionally, not by default.

## Styling Conventions
- Reuse theme tokens from `src/app/globals.css` instead of hardcoding random colors.
- Prefer semantic surfaces like `surface-*`, status styles like `status-*`, and shared utility classes already defined in global CSS.
- Use Tailwind utility classes for layout and spacing.
- Use `cn()` from `src/shared/utils/cn.ts` when class composition gets conditional.
- Keep mobile behavior first; the UI is explicitly designed for desktop and mobile.
- Preserve reduced-motion behavior and accessibility helpers already encoded in CSS.
- Respect the existing font system configured in `src/app/layout.tsx`.

## Error Handling Conventions
- Do not throw raw strings.
- Prefer using shared app/runtime helpers for recoverable errors and event-driven state where available.
- Prefer typed errors such as `RetryExhaustedError` where relevant.
- Keep user-facing error text explicit and local to the feature that owns the behavior.
- In API handlers, return structured JSON with status codes instead of leaking raw exceptions.
- Use `catch {}` only when intentionally ignoring an error is safe and obvious.
- Otherwise catch `error: unknown`, narrow with `instanceof Error`, and log with enough context.

## API And Security Notes
- The frontend connects to Backend backend via proxy routes in `src/app/api/`.
- Backend integration uses public API access in `src/infra/api/session.ts`.
- Shared proxy helpers in `src/infra/api/proxy.ts` handle upstream fetch, retry, and response validation.
- Proxy body reads are size-limited; keep request body limit enforcement in `src/infra/api/proxy.ts` when adding routes that read JSON.
- `DELETE /api/jobs/[id]` proxies backend job cancellation. Preserve this method if changing job route code.
- Treat `.env`, `.env.local`, and secrets as private; never commit secret values.
- CSP is nonce-based for scripts. Keep `src/proxy.ts`, `next.config.ts`, and `src/app/layout.tsx` aligned; do not reintroduce script `'unsafe-inline'`.
- `src/proxy.ts` matcher must exclude `/api/*` and static routes to ensure low latency for API calls.

## Backend Integration
- Backend URL: `BACKEND_API_URL` (e.g., `http://localhost:8080`)
- API routes proxy to Backend:
  - `POST /api/extract` → `POST /api/v1/extract`
  - `POST /api/download` → `POST /api/v1/download`
  - `GET /api/jobs/[id]` → `GET /api/v1/jobs/{id}`
  - `DELETE /api/jobs/[id]` → `DELETE /api/v1/jobs/{id}`
- See `src/infra/api//` for implementation details.

## Current Limits
- Max file size: 892MB (aligned with backend).

## i18n Notes
- Supported locales are currently `en` and `id`.
- When adding UI copy, update translation messages rather than hardcoding user-facing strings when the area is localized.
- Keep locale keys aligned between `src/i18n/messages/en.json` and `src/i18n/messages/id.json`.

## Practical Agent Workflow
- Read the surrounding file before editing because formatting is not fully uniform across the repo.
- Prefer minimal, surgical changes over broad rewrites.
- Preserve existing architecture boundaries between `app`, `components`, `modules`, `shared`, and `infra`.
- Add or update colocated tests when changing logic-heavy utilities, hooks, schemas, or API handlers.
- When touching commands or tooling, document current breakage rather than assuming the scripts already work.
