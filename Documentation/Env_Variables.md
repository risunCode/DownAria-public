# Environment Variables (Current Usage)

This document lists active `process.env` usage in the current frontend repository.

## Runtime app + server routes

### `NEXT_PUBLIC_API_URL`
- Used by server gateway routes in `src/app/api/web/*` to forward requests to backend.
- Also used by shared config consumers (`src/lib/config.ts` and API-related client modules).

### `WEB_INTERNAL_SHARED_SECRET`
- Used in `src/app/api/web/*` for request-signature headers.

### `NEXT_PUBLIC_APP_URL`
- Used in `src/app/api/web/_internal/signature.ts` as preferred origin for gateway forwarding/signing context.

### `FEEDBACK_DISCORD_WEBHOOK_URL`
- Used in `src/app/api/feedback/route.ts` for feedback webhook delivery.

### `NEXT_PUBLIC_BASE_URL`
- Used by shared config (`src/lib/config.ts`) for canonical app URL in metadata/link helpers.

### `NODE_ENV`
- Used in `src/lib/config.ts` (`IS_DEV` / `IS_PROD`) and gateway origin logic.

### `VERCEL`
- Used in `src/lib/config.ts` (`IS_VERCEL`).

## Important Note

- Env usage is intentionally split across shared config and route handlers.
- Do not assume a single centralized runtime env source; several server routes read `process.env` directly.
