/**
 * Lazy-loaded Sweetalert2 wrapper.
 * Avoids bundling ~50KB of sweetalert2 in the initial chunk.
 * Swal is only loaded on first invocation (user interaction).
 */

import type Swal from 'sweetalert2';
import type { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

type SwalType = typeof Swal;

let cached: SwalType | null = null;

export async function getSwal(): Promise<SwalType> {
  if (cached) return cached;
  const mod = await import('sweetalert2');
  cached = mod.default;
  return cached;
}

/**
 * Synchronously returns the cached Swal instance if it has already been loaded,
 * or null if it hasn't been loaded yet.
 * Safe to call inside synchronous callbacks (e.g. `didOpen`) after a prior
 * `lazySwal.fire()` / `getSwal()` call has already resolved.
 */
export function getCachedSwal(): SwalType | null {
  return cached;
}

/**
 * Drop-in replacement for `Swal.fire(...)`.
 * Supports all Swal.fire overloads: object config, positional args, or no args.
 * Usage: `const result = await lazySwal.fire({ ... })`
 */
export const lazySwal = {
  async fire(titleOrOptions?: string | SweetAlertOptions, html?: string, icon?: string): Promise<SweetAlertResult> {
    const swal = await getSwal();
    if (typeof titleOrOptions === 'object') {
      return swal.fire(titleOrOptions);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return swal.fire(titleOrOptions as any, html, icon as any);
  },
};
