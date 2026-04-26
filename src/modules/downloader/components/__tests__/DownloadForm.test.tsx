// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    if (namespace === 'download') {
      return (key: string) => ({
        pasteUrl: 'Paste URL',
        paste: 'Paste',
        pasted: 'Pasted',
        go: 'Go',
        downloadingFrom: 'Downloading from',
        processingLink: 'Processing link',
        'progress.starting': 'Starting',
        'progress.connecting': 'Connecting',
        'progress.fetching': 'Fetching',
        'progress.extracting': 'Extracting',
        'progress.validating': 'Validating',
        'progress.almostDone': 'Almost done',
        'progress.done': 'Done',
        'tips.tip1': 'Tip 1',
        'tips.tip2': 'Tip 2',
        'tips.tip3': 'Tip 3',
        'tips.tip4': 'Tip 4',
        'tips.tip5': 'Tip 5',
        'tips.tip6': 'Tip 6',
      }[key] ?? key);
    }

    return (key: string) => ({
      enterUrl: 'Enter URL',
      invalidUrl: 'Invalid URL',
      noValidUrl: 'No valid URL',
      unsupportedProtocol: 'Only http and https URLs are supported',
      pasteHint: 'Paste manually',
    }[key] ?? key);
  },
}));

Object.assign(navigator, {
  clipboard: {
    readText: vi.fn(),
  },
});

import { DownloadForm } from '@/modules/downloader/components/DownloadForm';

afterEach(() => {
  cleanup();
});

describe('DownloadForm', () => {
  function submitForm() {
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
  }

  it('shows an error for empty submissions and does not submit', async () => {
    const onSubmit = vi.fn();

    render(
      <DownloadForm
        platform="facebook"
        onPlatformChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
        enableAutoSubmit={false}
      />
    );

    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Enter URL')).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a sanitized valid URL and updates the detected platform', () => {
    const onSubmit = vi.fn();
    const onPlatformChange = vi.fn();

    render(
      <DownloadForm
        platform="facebook"
        onPlatformChange={onPlatformChange}
        onSubmit={onSubmit}
        isLoading={false}
        enableAutoSubmit={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Paste URL'), {
      target: { value: ' https://www.instagram.com/reel/abc123/ ' },
    });
    submitForm();

    expect(onPlatformChange).toHaveBeenCalledWith('instagram');
    expect(onSubmit).toHaveBeenCalledWith({
      platform: 'instagram',
      url: 'https://www.instagram.com/reel/abc123/',
    });
  });

  it('turns a pasted bare domain into a valid https URL', () => {
    const onSubmit = vi.fn();
    const onPlatformChange = vi.fn();

    render(
      <DownloadForm
        platform="facebook"
        onPlatformChange={onPlatformChange}
        onSubmit={onSubmit}
        isLoading={false}
        enableAutoSubmit={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Paste URL'), {
      target: { value: 'www.instagram.com/reel/abc123/' },
    });
    submitForm();

    expect(onPlatformChange).toHaveBeenCalledWith('instagram');
    expect(onSubmit).toHaveBeenCalledWith({
      platform: 'instagram',
      url: 'https://www.instagram.com/reel/abc123/',
    });
  });

  it('shows a specific protocol error for unsupported URLs', async () => {
    const onSubmit = vi.fn();

    render(
      <DownloadForm
        platform="facebook"
        onPlatformChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
        enableAutoSubmit={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Paste URL'), {
      target: { value: 'ftp://example.com/video.mp4' },
    });
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Only http and https URLs are supported')).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
