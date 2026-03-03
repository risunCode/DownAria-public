# Process Environment Variables

This document lists the `process.env` variables currently used after the centralized config refactor.

## 1) Single source of truth (runtime app)

All runtime frontend env reads are centralized in `src/lib/config.ts`:

- `NEXT_PUBLIC_API_URL` -> `API_URL`
- `NEXT_PUBLIC_BASE_URL` -> `BASE_URL`
- `NODE_ENV` -> `IS_DEV`, `IS_PROD`
- `VERCEL` -> `IS_VERCEL`

Other modules import constants from `src/lib/config.ts` instead of reading `process.env` directly.

Usage examples:

- `API_URL`: `src/lib/api/client.ts`, `src/lib/api/proxy.ts`, `src/hooks/useUpdatePrompt.ts`, `src/components/download/PublicStats.tsx`, `src/lib/utils/media.ts`
- `BASE_URL`: `src/app/layout.tsx`, `src/components/core/StructuredData.tsx`, `src/lib/utils/discord-webhook.ts`
- `IS_DEV` / `IS_VERCEL`: `src/app/layout.tsx`, `src/lib/utils/discord-webhook.ts`

## 2) Variables still read directly (build config)

Outside the runtime app, `next.config.ts` still reads:

- `NEXT_PUBLIC_API_URL`

Purpose: include the API origin in Content Security Policy (`connect-src`) during Next.js build/start.

## 3) Notes on other variables

Variables present in `.env.example` but not currently read by active frontend code paths remain optional and do not affect the main extract/download flow.
