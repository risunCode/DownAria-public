// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerMock, historyServiceMock } = vi.hoisted(() => ({
  routerMock: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  historyServiceMock: {
    initStorage: vi.fn().mockResolvedValue(undefined),
    getHistory: vi.fn(),
    getHistoryCount: vi.fn(),
    getHistoryTypeCounts: vi.fn(),
    deleteHistory: vi.fn(),
    clearHistory: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/history',
  useSearchParams: () => ({
    get: () => null,
    toString: () => '',
  }),
}));

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    if (namespace === 'historyList') {
      return (key: string) => ({
        unknownQuality: 'Unknown quality',
        emptyTitle: 'No history yet',
        emptyDescription: 'Downloaded items will appear here.',
      }[key] ?? key);
    }

    return (key: string) => key;
  },
}));

vi.mock('@/modules/history/services', () => historyServiceMock);
vi.mock('@/shared/utils/lazy-swal', () => ({
  lazySwal: { fire: vi.fn() },
}));

import { HistoryList } from './HistoryList';

describe('HistoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    historyServiceMock.initStorage.mockResolvedValue(undefined);
    historyServiceMock.getHistoryTypeCounts.mockResolvedValue({ all: 0, video: 0, image: 0, audio: 0 });
    historyServiceMock.getHistoryCount.mockResolvedValue(0);
  });

  it('shows the empty state when history loading fails', async () => {
    historyServiceMock.getHistory.mockRejectedValue(new Error('boom'));

    render(<HistoryList />);

    await waitFor(() => {
      expect(screen.getByText('No history yet')).toBeTruthy();
      expect(screen.getByText('Downloaded items will appear here.')).toBeTruthy();
    });
  });
});
