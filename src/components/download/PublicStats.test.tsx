// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POLLING_INTERVAL_MS, PublicStats } from './PublicStats';

type StatsPayload = {
  todayVisits: number;
  totalVisits: number;
  totalExtractions: number;
  totalDownloads: number;
};

function createJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

function createStatsEnvelope(payload: StatsPayload) {
  return {
    success: true,
    data: payload,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('PublicStats', () => {
  it('renders live stats after successful fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(
          createStatsEnvelope({
            todayVisits: 12_345,
            totalVisits: 98_765,
            totalExtractions: 54_321,
            totalDownloads: 11_111,
          }),
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    render(<PublicStats />);

    await waitFor(() => {
      expect(screen.getByText('Today: 12 345')).toBeTruthy();
    });

    expect(screen.getByText('Total: 98 765')).toBeTruthy();
    expect(screen.getByText('54 321')).toBeTruthy();
    expect(screen.getByText('11 111')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/stats/public', expect.objectContaining({ method: 'GET' }));
  });

  it('refreshes stats on polling interval', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T00:00:00.000Z'));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          createStatsEnvelope({
            todayVisits: 10,
            totalVisits: 100,
            totalExtractions: 200,
            totalDownloads: 300,
          }),
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          createStatsEnvelope({
            todayVisits: 20,
            totalVisits: 120,
            totalExtractions: 250,
            totalDownloads: 350,
          }),
        ),
      );

    vi.stubGlobal('fetch', fetchMock);
    render(<PublicStats />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Today: 10')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('Today: 20')).toBeTruthy();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Updated just now')).toBeTruthy();
  });

  it('keeps fallback layout when fetch fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network failed'));

    vi.stubGlobal('fetch', fetchMock);
    render(<PublicStats />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Today: 0')).toBeTruthy();
    expect(screen.getByText('Total: 0')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByText('Waiting for data (retrying)')).toBeTruthy();
    });
  });
});
