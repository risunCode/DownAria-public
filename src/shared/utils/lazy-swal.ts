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

export function getCachedSwal(): SwalType | null {
  return cached;
}

export const lazySwal = {
  async fire(titleOrOptions?: string | SweetAlertOptions, html?: string, icon?: string): Promise<SweetAlertResult> {
    const swal = await getSwal();
    if (typeof titleOrOptions === 'object') {
      return swal.fire(titleOrOptions);
    }
    return swal.fire(titleOrOptions as never, html, icon as never);
  },
};
