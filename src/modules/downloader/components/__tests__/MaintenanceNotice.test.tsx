// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_ALTERNATE_SITE_URL', 'https://fetchtiumv2.vercel.app');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    if (namespace === 'maintenance') {
      return (key: string) => ({
        title: 'Under Maintenance',
        defaultMessage: 'DownAria is temporarily unavailable.',
        alternateSiteMessage: 'Use the alternate site while maintenance is in progress.',
        alternateSiteButton: 'Use Alternate Site',
      }[key] ?? key);
    }

    return (key: string) => ({
      settings: 'Settings',
      history: 'History',
    }[key] ?? key);
  },
}));

import { MaintenanceNotice } from '@/modules/downloader/components/MaintenanceNotice';

describe('MaintenanceNotice', () => {
  it('renders the alternate site CTA and submitted URL', () => {
    render(<MaintenanceNotice submittedUrl="https://example.com/post/1" />);

    const alternateSiteLink = screen.getByRole('link', { name: 'Use Alternate Site' });

    expect(screen.getByText('Under Maintenance')).toBeTruthy();
    expect(screen.getByText('https://example.com/post/1')).toBeTruthy();
    expect(alternateSiteLink.getAttribute('href')).toBe('https://fetchtiumv2.vercel.app/');
  });
});
