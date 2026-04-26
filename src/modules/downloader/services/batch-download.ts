'use client';

import JSZip from 'jszip';

import { type PreviewItem, type PreviewResult } from '@/modules/downloader/model/preview';
import {
  buildDownloadTaskKey,
  buildPreviewDownloadRequest,
  extractAsyncDownload,
  extractEnvelopeError,
  extractJobEnvelope,
  getPreviewFormatById,
} from '@/modules/downloader/services/preview';
import { executePreviewDownload } from '@/modules/downloader/services/download-client';
import { sanitizeFilenamePart } from '@/modules/downloader/utils/preview-helpers';
import { createTimeoutSignal, mergeAbortSignals } from '@/shared/utils/fetch-timeout';
import { backoffWithJitter } from '@/shared/utils/backoff';

const ZIP_JOB_TIMEOUT_MS = 10 * 60 * 1000;

function ensureJsonContent(response: Response): void {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Unexpected non-JSON response.');
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function cancelBackendJob(jobId: string): Promise<void> {
  try {
    await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
      cache: 'no-store',
      credentials: 'include',
    });
  } catch {
    // best-effort cancellation
  }
}

function batchText(t: ((key: string) => string) | undefined, key: string, fallback: string): string {
  return t ? t(key) : fallback;
}

async function waitForAsyncArtifactBlob(jobId: string, abortSignal?: AbortSignal): Promise<Blob> {
  const startedAt = Date.now();
  let attempt = 0;
  let transientErrors = 0;
  const abortBackendJob = () => {
    void cancelBackendJob(jobId);
  };

  if (abortSignal?.aborted) {
    await cancelBackendJob(jobId);
    throw new DOMException('Download cancelled', 'AbortError');
  }
  abortSignal?.addEventListener('abort', abortBackendJob, { once: true });

  try {
  while (Date.now() - startedAt < ZIP_JOB_TIMEOUT_MS) {
    const statusResponse = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      cache: 'no-store',
      keepalive: true,
      signal: abortSignal
        ? mergeAbortSignals([createTimeoutSignal(), abortSignal])
        : createTimeoutSignal(),
    });

    ensureJsonContent(statusResponse);
    const statusPayload = await statusResponse.json();

    if (!statusResponse.ok) {
      if ((statusResponse.status === 503 || statusResponse.status === 504 || statusResponse.status === 429) && transientErrors < 3) {
        transientErrors += 1;
        // eslint-disable-next-line no-await-in-loop
        await sleep(backoffWithJitter(attempt));
        attempt += 1;
        continue;
      }
      throw new Error(extractEnvelopeError(statusPayload));
    }

    transientErrors = 0;
    const job = extractJobEnvelope(statusPayload);
    if (!job) {
      throw new Error(extractEnvelopeError(statusPayload));
    }

    if (job.state === 'completed') {
      const artifactResponse = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/artifact`, {
        method: 'GET',
        cache: 'no-store',
        keepalive: true,
        signal: abortSignal
          ? mergeAbortSignals([createTimeoutSignal(), abortSignal])
          : createTimeoutSignal(),
      });

      if (!artifactResponse.ok) {
        const contentType = artifactResponse.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          throw new Error(extractEnvelopeError(await artifactResponse.json()));
        }
        throw new Error('Artifact download failed.');
      }

      return artifactResponse.blob();
    }

    if (job.state === 'failed' || job.state === 'expired') {
      throw new Error(job.error?.message || 'Download failed.');
    }
    if (job.state === 'cancelled') {
      throw new DOMException('Download cancelled', 'AbortError');
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(backoffWithJitter(attempt));
    attempt += 1;
  }

  throw new Error('Timed out while waiting for ZIP artifact.');
  } finally {
    abortSignal?.removeEventListener('abort', abortBackendJob);
  }
}

export interface BatchProgressState {
  current: number;
  total: number;
  status: string;
}

interface BatchDownloadOptions {
  result: PreviewResult;
  items: PreviewItem[];
  selectedFormatIds: Record<string, string>;
  onProgress: (progress: BatchProgressState) => void;
  abortRef?: { cancelled: boolean };
  abortSignal?: AbortSignal;
  t?: (key: string) => string;
}

export async function runSequentialBatchDownloads({
  result,
  items,
  selectedFormatIds,
  onProgress,
  abortRef,
  abortSignal,
  t,
}: BatchDownloadOptions): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const CONCURRENCY = 5;
  let completed = 0;

  onProgress({ current: 0, total: items.length, status: batchText(t, 'startingDownloads', 'Starting downloads...') });

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    if (abortRef?.cancelled || abortSignal?.aborted) {
      return;
    }

    const chunk = items.slice(i, i + CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      chunk.map(async (item) => {
        if (abortRef?.cancelled || abortSignal?.aborted) return;

        const formatId = selectedFormatIds[item.id] || item.preferredFormatId;
        const format = getPreviewFormatById(item, formatId) || item.formats[0];
        if (!format) return;

        const taskKey = buildDownloadTaskKey(result, item, format);
        await executePreviewDownload(result, item, format, taskKey, abortSignal);

        completed++;
        onProgress({ current: completed, total: items.length, status: `Downloading ${completed}/${items.length}...` });
      })
    );
  }
}

async function downloadItemToBlob(
  item: PreviewItem,
  formatId: string,
  result: PreviewResult,
  idx: number,
  abortSignal?: AbortSignal
): Promise<{ filename: string; blob: Blob }> {
  const format = getPreviewFormatById(item, formatId) || item.formats[0];
  if (!format) {
    throw new Error('No format available');
  }

  const request = buildPreviewDownloadRequest(result, item, format);
  const signal = abortSignal
    ? mergeAbortSignals([createTimeoutSignal(), abortSignal])
    : createTimeoutSignal();
  // keepalive: true reuses TCP connections across batch requests (HTTP keep-alive).
  // Browsers allow up to 6 concurrent connections per origin (HTTP/1.1) or multiplex (HTTP/2).
  const response = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, async: false }),
    credentials: 'include',
    keepalive: true,
    signal,
  });

  let blob: Blob;
  const contentType = response.headers.get('Content-Type') || '';

  if (response.status === 202 || contentType.includes('application/json')) {
    ensureJsonContent(response);
    const payload = await response.json();
    if (response.status === 202) {
      const asyncDownload = extractAsyncDownload(payload);
      if (!asyncDownload) {
        throw new Error(extractEnvelopeError(payload));
      }
      blob = await waitForAsyncArtifactBlob(asyncDownload.job.id, abortSignal);
    } else {
      throw new Error(extractEnvelopeError(payload));
    }
  } else {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    blob = await response.blob();
  }

  const fallbackExt = format.kind === 'video' ? 'mp4' : format.kind === 'audio' ? (format.container || 'm4a') : 'jpg';
  const filename = sanitizeFilenamePart(
    `${String(idx).padStart(3, '0')}_${item.filename || `media.${fallbackExt}`}`,
    `${String(idx).padStart(3, '0')}_media.${fallbackExt}`,
    200
  );

  return { filename, blob };
}

export async function runZipDownload({
  result,
  items,
  selectedFormatIds,
  onProgress,
  abortRef,
  abortSignal,
  t,
}: BatchDownloadOptions): Promise<void> {
  if (items.length === 0) {
    return;
  }

  onProgress({ current: 0, total: items.length, status: batchText(t, 'preparingZip', 'Preparing ZIP...') });

  const zip = new JSZip();
  const zipBaseName = sanitizeFilenamePart(result.title || 'download', 'download', 50);
  const folder = zip.folder(zipBaseName);
  if (!folder) {
    return;
  }

  const CONCURRENCY = 5;
  let downloaded = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    if (abortRef?.cancelled || abortSignal?.aborted) {
      return;
    }

    const chunk = items.slice(i, i + CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(
      chunk.map((item, chunkIdx) => {
        const idx = i + chunkIdx + 1;
        const formatId = selectedFormatIds[item.id] || item.preferredFormatId;
        return downloadItemToBlob(item, formatId, result, idx, abortSignal);
      })
    );

    for (const settled of results) {
      if (settled.status === 'fulfilled') {
        folder.file(settled.value.filename, settled.value.blob);
        downloaded++;
      } else {
        if (settled.reason instanceof Error && settled.reason.name === 'AbortError') {
          return;
        }
        failed += 1;
      }
    }

    onProgress({ current: Math.min(i + CONCURRENCY, items.length), total: items.length, status: `Downloading ${Math.min(i + CONCURRENCY, items.length)}/${items.length}...` });
  }

  onProgress({
    current: downloaded,
    total: items.length,
    status: failed > 0
      ? `Downloaded ${downloaded}/${items.length}. Failed ${failed}.`
      : `Downloaded ${downloaded}/${items.length}.`,
  });

  if (downloaded === 0) {
    onProgress({ current: 0, total: items.length, status: batchText(t, 'noFilesDownloaded', 'No files were downloaded') });
    return;
  }

  onProgress({ current: items.length, total: items.length, status: batchText(t, 'creatingZip', 'Creating ZIP...') });

  try {
    const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(content);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${zipBaseName}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    onProgress({ current: downloaded, total: items.length, status: batchText(t, 'zipGenerationFailed', 'Failed to create ZIP archive') });
    throw err;
  }
}
