const DEFAULT_BACKEND_API_URL = 'http://localhost:8080';

export function buildBackendUrl(path: string): string {
  const configured = process.env.BACKEND_API_URL?.trim();
  const baseUrl = (configured || DEFAULT_BACKEND_API_URL).replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
