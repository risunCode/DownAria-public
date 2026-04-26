// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { type BackendExtractData, type BackendResponse } from '@/infra/api/types';

vi.mock('@/modules/downloader/services/download-client', () => ({
  executeBatchPreviewDownload: vi.fn().mockResolvedValue(undefined),
  executePreviewDownload: vi.fn().mockResolvedValue(undefined),
}));

import { DownloadPreview } from '@/modules/downloader/components/DownloadPreview';
import enMessages from '@/i18n/messages/en.json';

const result: BackendResponse<BackendExtractData> = {
  success: true,
  response_time_ms: 120,
  data: {
    url: 'https://www.youtube.com/watch?v=abc123',
    platform: 'youtube',
    extract_profile: 'generic',
    content_type: 'post',
    title: 'Example Video',
    author: { name: 'Example Author', handle: '@example' },
    thumbnail_url: 'https://example.com/thumb.jpg',
    media: [
      {
        index: 0,
        type: 'video',
        filename: 'example-video.mp4',
        thumbnail_url: 'https://example.com/thumb.jpg',
        sources: [
          {
            quality: '720p',
            url: 'https://cdn.example.com/video.mp4',
            mime_type: 'video/mp4',
            file_size_bytes: 4_000_000,
            stream_profile: 'muxed_progressive',
          },
        ],
      },
      {
        index: 1,
        type: 'audio',
        filename: 'example-audio.m4a',
        thumbnail_url: 'https://example.com/thumb.jpg',
        sources: [
          {
            quality: 'audio',
            url: 'https://cdn.example.com/audio.m4a',
            mime_type: 'audio/mp4',
            file_size_bytes: 1_000_000,
            stream_profile: 'audio_only',
          },
        ],
      },
    ],
  },
};

describe('DownloadPreview', () => {
  it('renders extracted result controls and opens the gallery modal', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <DownloadPreview result={result} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Example Video')).toBeTruthy();

    const [previewButton] = screen.getAllByRole('button', { name: /open gallery/i });
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });
  });
});
