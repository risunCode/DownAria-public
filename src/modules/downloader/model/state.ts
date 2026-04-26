export type DownloaderFeatureStatus = 'paused' | 'limited' | 'ready';

import { type DownloaderSubmission } from '@/modules/downloader/model/submission';

export type DownloaderRequestState =
  | { status: 'idle'; submittedUrl: null; lastSubmission: null }
  | { status: 'maintenance'; submittedUrl: string | null; lastSubmission: DownloaderSubmission | null };

export function createIdleDownloaderRequestState(): DownloaderRequestState {
  return { status: 'idle', submittedUrl: null, lastSubmission: null };
}

export function createMaintenanceDownloaderRequestState(submission: DownloaderSubmission | null): DownloaderRequestState {
  return { status: 'maintenance', submittedUrl: submission?.url ?? null, lastSubmission: submission };
}
