'use client';

import {
  getDownloadTaskState,
  patchDownloadTaskState,
  registerController,
  removeController,
  resetDownloadTaskState,
  setDownloadTaskState,
} from '@/modules/downloader/services/download-store';
import { toast } from 'sonner';
import {
  buildPreviewDownloadRequest,
  extractAsyncDownload,
  extractEnvelopeError,
  extractJobEnvelope,
  persistPreviewHistory,
  statusFromJob,
  type PreviewDownloadRequest,
} from '@/modules/downloader/services/preview';
import { type PreviewFormat, type PreviewItem, type PreviewResult } from '@/modules/downloader/model/preview';
import { createTimeoutSignal, mergeAbortSignals } from '@/shared/utils/fetch-timeout';
import { backoffWithJitter } from '@/shared/utils/backoff';

const JOB_TIMEOUT_MS = 10 * 60 * 1000;
const DOWNLOAD_STREAM_IDLE_TIMEOUT_MS = 90_000;

const inFlightDownloads = new Map<string, Promise<void>>();

function ensureBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('Downloads are only available in the browser.');
  }
}

function resolveFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get('Content-Disposition') || '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return sanitizeFilename(decodeURIComponent(utf8Match[1]), fallback);
    } catch {
      return sanitizeFilename(utf8Match[1], fallback);
    }
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return sanitizeFilename(plainMatch[1], fallback);
  }

  return sanitizeFilename(fallback, 'download');
}

function sanitizeFilename(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  const sanitized = trimmed
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || fallback;
}

const LARGE_DOWNLOAD_THRESHOLD = 100 * 1024 * 1024; // 100 MB

interface SaveFilePickerResult {
  createWritable: () => Promise<{ write: (chunk: Uint8Array) => Promise<void>; close: () => Promise<void>; abort?: () => Promise<void> }>;
}

type SaveFilePicker = (options?: { suggestedName?: string }) => Promise<SaveFilePickerResult>;

function toBlobChunk(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function createStreamIdleTimeoutError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Download stalled due to no progress.', 'TimeoutError');
  }
  const error = new Error('Download stalled due to no progress.');
  error.name = 'TimeoutError';
  return error;
}

async function readChunkWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleTimeoutMs: number
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(createStreamIdleTimeoutError()), idleTimeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

async function tryStreamLargeDownloadToDisk(
  response: Response,
  filename: string,
  taskKey: string,
  totalBytes: number
): Promise<boolean> {
  ensureBrowser();

  if (!response.body) {
    return false;
  }

  const showSaveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (typeof showSaveFilePicker !== 'function') {
    return false;
  }

  let writable: { write: (chunk: Uint8Array) => Promise<void>; close: () => Promise<void>; abort?: () => Promise<void> } | null = null;

  try {
    const fileHandle = await showSaveFilePicker({ suggestedName: filename });
    writable = await fileHandle.createWritable();

    const reader = response.body.getReader();
    let loaded = 0;

    while (true) {
      const { done, value } = await readChunkWithIdleTimeout(reader, DOWNLOAD_STREAM_IDLE_TIMEOUT_MS);
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }

      await writable.write(value);
      loaded += value.length;
      patchDownloadTaskState(taskKey, {
        status: 'downloading',
        progress: totalBytes > 0 ? Math.min(99, Math.round((loaded / totalBytes) * 100)) : 75,
        message: totalBytes > 0 ? `Streaming ${Math.round((loaded / totalBytes) * 100)}%` : 'Streaming to disk',
      });
    }

    await writable.close();
    return true;
  } catch (error) {
    if (writable?.abort) {
      try {
        await writable.abort();
      } catch {
        // No-op: best effort abort.
      }
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    return false;
  }
}

async function saveBinaryResponse(response: Response, fallbackFilename: string, taskKey: string): Promise<void> {
  ensureBrowser();

  const totalHeader = response.headers.get('Content-Length');
  const total = totalHeader ? Number.parseInt(totalHeader, 10) : 0;
  const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
  const filename = resolveFilename(response, fallbackFilename);

  if (!response.body) {
    throw new Error('Download stream is unavailable.');
  }

  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let loaded = 0;
  const startTime = Date.now();

  while (true) {
    const { done, value } = await readChunkWithIdleTimeout(reader, DOWNLOAD_STREAM_IDLE_TIMEOUT_MS);
    if (done) break;
    if (!value) continue;

    chunks.push(toBlobChunk(value));
    loaded += value.length;

    const elapsedMs = Date.now() - startTime;
    const speedBytesPerSec = elapsedMs > 0 ? (loaded / elapsedMs) * 1000 : 0;
    const speedStr = formatSpeed(speedBytesPerSec);
    const progress = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 70;
    
    let message = `Downloading to browser: ${progress}%`;
    if (total > 0) {
      message = `Downloading to browser: ${speedStr} (${formatBytes(loaded)} / ${formatBytes(total)})`;
    } else {
      message = `Downloading to browser: ${speedStr} (${formatBytes(loaded)})`;
    }

    patchDownloadTaskState(taskKey, {
      status: 'downloading',
      progress,
      message,
    });
  }

  const blob = new Blob(chunks, { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond: number): string {
  const mbps = (bytesPerSecond * 8) / (1024 * 1024);
  if (mbps < 1) {
    const kbps = (bytesPerSecond * 8) / 1024;
    return `${kbps.toFixed(1)} Kbps`;
  }
  return `${mbps.toFixed(1)} Mbps`;
}

async function expectJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Unexpected non-JSON response.');
  }

  return response.json();
}

function mergeSignals(timeoutSignal: AbortSignal, abortSignal?: AbortSignal): AbortSignal {
  return abortSignal ? mergeAbortSignals([timeoutSignal, abortSignal]) : timeoutSignal;
}

function createAbortError(message = 'Download cancelled'): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError');
  }
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

/**
 * Polls the job endpoint until the artifact is ready.
 * keepalive: true reuses the TCP connection across repeated polling requests,
 * reducing per-request overhead (browsers: 6 connections/origin on HTTP/1.1, multiplexed on HTTP/2).
 */
async function pollJobUntilArtifact(jobId: string, taskKey: string, fallbackFilename: string, abortSignal?: AbortSignal): Promise<void> {
  const startedAt = Date.now();
  let parseFailures = 0;
  let attempt = 0;
  let transientErrors = 0;

  while (Date.now() - startedAt < JOB_TIMEOUT_MS) {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      cache: 'no-store',
      keepalive: true,
      signal: mergeSignals(createTimeoutSignal(), abortSignal),
    });

    let payload: unknown;
    try {
      payload = await expectJson(response);
    } catch {
      parseFailures += 1;
      if (parseFailures > 1) {
        throw new Error('Upstream returned an invalid JSON response.');
      }
      await new Promise((resolve) => setTimeout(resolve, backoffWithJitter(attempt)));
      attempt += 1;
      continue;
    }

    if (!response.ok) {
      if ((response.status === 503 || response.status === 504 || response.status === 429) && transientErrors < 3) {
        transientErrors += 1;
        await new Promise((resolve) => setTimeout(resolve, backoffWithJitter(attempt)));
        attempt += 1;
        continue;
      }
      throw new Error(extractEnvelopeError(payload));
    }

    transientErrors = 0;
    const job = extractJobEnvelope(payload);

    if (!job) {
      throw new Error(extractEnvelopeError(payload));
    }

    setDownloadTaskState(taskKey, statusFromJob(job));

    if (job.state === 'completed') {
      const artifactResponse = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/artifact`, {
        method: 'GET',
        cache: 'no-store',
        keepalive: true,
        signal: abortSignal,
      });

      if (!artifactResponse.ok) {
        const payloadOrMessage = artifactResponse.headers.get('Content-Type')?.includes('application/json')
          ? extractEnvelopeError(await artifactResponse.json())
          : 'Artifact download failed.';
        throw new Error(payloadOrMessage);
      }

      await saveBinaryResponse(artifactResponse, job.artifact?.filename || fallbackFilename, taskKey);
      return;
    }

    if (job.state === 'failed' || job.state === 'expired') {
      throw new Error(job.error?.message || 'Download failed.');
    }

    if (job.state === 'cancelled') {
      throw createAbortError();
    }

    await new Promise((resolve) => setTimeout(resolve, backoffWithJitter(attempt)));
    attempt += 1;
  }

  throw new Error('Timed out while waiting for the download job.');
}

async function triggerDownloadRequest(request: PreviewDownloadRequest, taskKey: string, fallbackFilename: string, abortSignal?: AbortSignal): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (request.async) {
    headers.Prefer = 'respond-async';
  }

  const response = await fetch('/api/download', {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    keepalive: true,
    signal: abortSignal,
  });

  if (response.status === 202) {
    const payload = await expectJson(response);
    const asyncDownload = extractAsyncDownload(payload);
    if (!asyncDownload) {
      throw new Error(extractEnvelopeError(payload));
    }

    setDownloadTaskState(taskKey, {
      status: 'queued',
      progress: 10,
      message: 'Job queued',
      jobId: asyncDownload.job.id,
      filename: asyncDownload.job.artifact?.filename || fallbackFilename,
    });
    await pollJobUntilArtifact(asyncDownload.job.id, taskKey, fallbackFilename, abortSignal);
    return;
  }

  if (!response.ok) {
    const payload = response.headers.get('Content-Type')?.includes('application/json')
      ? await response.json()
      : null;
    throw new Error(payload ? extractEnvelopeError(payload) : 'Download failed.');
  }

  setDownloadTaskState(taskKey, {
    status: 'downloading',
    progress: 5,
    message: 'Preparing download',
    filename: fallbackFilename,
  });
  await saveBinaryResponse(response, fallbackFilename, taskKey);
}

export function executePreviewDownload(
  result: PreviewResult,
  item: PreviewItem,
  format: PreviewFormat,
  taskKey: string,
  abortSignal?: AbortSignal
): Promise<void> {
  const existing = inFlightDownloads.get(taskKey);
  if (existing) {
    return existing;
  }

  const controller = new AbortController();
  registerController(taskKey, controller);
  const mergedSignal = abortSignal
    ? mergeAbortSignals([controller.signal, abortSignal])
    : controller.signal;

  const promise = _executePreviewDownload(result, item, format, taskKey, mergedSignal).finally(() => {
    inFlightDownloads.delete(taskKey);
    removeController(taskKey);
  });
  inFlightDownloads.set(taskKey, promise);
  return promise;
}

async function _executePreviewDownload(
  result: PreviewResult,
  item: PreviewItem,
  format: PreviewFormat,
  taskKey: string,
  abortSignal?: AbortSignal
): Promise<void> {
  const request = buildPreviewDownloadRequest(result, item, format);
  const fallbackFilename = request.filename || item.filename || result.filename || 'download';

  setDownloadTaskState(taskKey, {
    status: 'preparing',
    progress: 2,
    message: 'Preparing request',
    filename: fallbackFilename,
  });

  try {
    await triggerDownloadRequest(request, taskKey, fallbackFilename, abortSignal);
    setDownloadTaskState(taskKey, {
      status: 'completed',
      progress: 100,
      message: 'Download completed',
      filename: fallbackFilename,
    });
    try {
      await persistPreviewHistory(result, item, format);
    } catch {
      // History persistence should not downgrade a successful download.
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const current = getDownloadTaskState(taskKey);
      if (current.status !== 'cancelled') {
        setDownloadTaskState(taskKey, {
          status: 'cancelled',
          progress: 0,
          message: 'Download cancelled',
          filename: fallbackFilename,
        });
      }
      return;
    }
    const message = error instanceof Error ? error.message : 'Download failed.';
    toast.error('Download Failed', {
      description: message,
    });
    setDownloadTaskState(taskKey, {
      status: 'error',
      progress: 100,
      message,
      error: message,
      filename: fallbackFilename,
    });
    throw error;
  }
}

export async function executeBatchPreviewDownload(
  entries: Array<{ result: PreviewResult; item: PreviewItem; format: PreviewFormat; taskKey: string }>
): Promise<void> {
  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop
    await executePreviewDownload(entry.result, entry.item, entry.format, entry.taskKey);
  }
}

export function clearPreviewDownload(taskKey: string) {
  resetDownloadTaskState(taskKey);
}
