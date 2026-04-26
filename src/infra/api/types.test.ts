import { describe, expect, it } from 'vitest';

import { isBackendExtractData, isBackendJobData } from './types';

describe('isBackendJobData', () => {
  it('accepts known job states', () => {
    const value = {
      id: 'job_1',
      type: 'download',
      state: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:01Z',
      status_url: '/api/jobs/job_1',
      artifact_url: '/api/jobs/job_1/artifact',
    };

    expect(isBackendJobData(value)).toBe(true);
  });

  it('accepts cancelled job states', () => {
    const value = {
      id: 'job_1',
      type: 'download',
      state: 'cancelled',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:01Z',
      status_url: '/api/jobs/job_1',
      artifact_url: '/api/jobs/job_1/artifact',
    };

    expect(isBackendJobData(value)).toBe(true);
  });

  it('rejects unknown job states', () => {
    const value = {
      id: 'job_1',
      type: 'download',
      state: 'cancel_requested',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:01Z',
      status_url: '/api/jobs/job_1',
      artifact_url: '/api/jobs/job_1/artifact',
    };

    expect(isBackendJobData(value)).toBe(false);
  });
});

describe('isBackendExtractData', () => {
  const validExtractData = {
    url: 'https://example.com/post/1',
    platform: 'example',
    content_type: 'post',
    media: [
      {
        index: 0,
        type: 'video',
        sources: [
          {
            url: 'https://cdn.example.com/video.mp4',
            mime_type: 'video/mp4',
            stream_profile: 'muxed_progressive',
            is_progressive: true,
            needs_merge: false,
          },
        ],
      },
    ],
  };

  it('accepts media sources with known stream profiles', () => {
    expect(isBackendExtractData(validExtractData)).toBe(true);
  });

  it('rejects extract payloads with malformed media entries', () => {
    expect(isBackendExtractData({
      ...validExtractData,
      media: [
        {
          index: 0,
          type: 'video',
          sources: [
            {
              url: 'https://cdn.example.com/video.mp4',
              stream_profile: 'unknown_profile',
            },
          ],
        },
      ],
    })).toBe(false);
    expect(isBackendExtractData({
      ...validExtractData,
      media: [
        {
          index: 0,
          type: 'video',
          sources: [
            {
              url: 'https://cdn.example.com/video.mp4',
              file_size_bytes: Number.NaN,
            },
          ],
        },
      ],
    })).toBe(false);
  });
});
