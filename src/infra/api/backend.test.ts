import { describe, expect, it, vi } from 'vitest';
import { buildBackendUrl } from './backend';

describe('backend API utils', () => {
  it('builds absolute URLs correctly', () => {
    vi.stubEnv('BACKEND_API_URL', 'https://api.example.com');
    expect(buildBackendUrl('/test')).toBe('https://api.example.com/test');
    expect(buildBackendUrl('test')).toBe('https://api.example.com/test');
    vi.unstubAllEnvs();
  });

  it('falls back to default URL when env is missing', () => {
    vi.stubEnv('BACKEND_API_URL', '');
    expect(buildBackendUrl('/test')).toBe('http://localhost:8080/test');
    vi.unstubAllEnvs();
  });
});