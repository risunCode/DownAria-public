import { isRecord } from '@/shared/utils/type-guards';

export interface BackendError {
  kind?: string;
  code?: string;
  message: string;
  retryable?: boolean;
  request_id?: string;
}

export interface BackendResponse<T> {
  success: boolean;
  response_time_ms: number;
  cached?: boolean;
  data?: T;
  error?: BackendError;
}

export interface BackendAuthor {
  name?: string;
  handle?: string;
}

export interface BackendEngagement {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  bookmarks?: number;
}

export interface BackendMediaSource {
  quality?: string;
  url: string;
  mime_type?: string;
  file_size_bytes?: number;
  stream_profile?: 'image' | 'audio_only' | 'video_only_adaptive' | 'video_only_progressive' | 'muxed_progressive' | 'muxed_adaptive';
  is_progressive?: boolean;
  needs_merge?: boolean;
}

export interface BackendMediaItem {
  index: number;
  type: string;
  filename?: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  sources: BackendMediaSource[];
}

export interface BackendExtractData {
  url: string;
  platform: string;
  extract_profile?: string;
  content_type: string;
  title?: string;
  author?: BackendAuthor;
  engagement?: BackendEngagement;
  filename?: string;
  thumbnail_url?: string;
  visibility?: string;
  file_size_bytes?: number;
  media: BackendMediaItem[];
}

export interface BackendArtifact {
  id: string;
  path?: string;
  filename: string;
  content_type: string;
  content_bytes: number;
  created_at: string;
  expires_at: string;
}

export interface BackendJobError {
  code?: string;
  message?: string;
  retryable?: boolean;
}

export interface BackendJobData {
  id: string;
  type: string;
  state: 'pending' | 'downloading' | 'merging' | 'converting' | 'completed' | 'failed' | 'expired' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
  selected_formats?: string[];
  artifact?: BackendArtifact;
  error?: BackendJobError;
  status_url: string;
  artifact_url: string;
}

const BACKEND_JOB_STATES: ReadonlySet<BackendJobData['state']> = new Set([
  'pending',
  'downloading',
  'merging',
  'converting',
  'completed',
  'failed',
  'expired',
  'cancelled',
]);

const BACKEND_STREAM_PROFILES: ReadonlySet<NonNullable<BackendMediaSource['stream_profile']>> = new Set([
  'image',
  'audio_only',
  'video_only_adaptive',
  'video_only_progressive',
  'muxed_progressive',
  'muxed_adaptive',
]);

export interface BackendAsyncDownloadData {
  mode: 'async';
  job: BackendJobData;
}

export function isBackendResponse(value: unknown): value is BackendResponse<unknown> {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.success === 'boolean'
    && typeof value.response_time_ms === 'number';
}

export function isBackendJobData(value: unknown): value is BackendJobData {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.type === 'string'
    && typeof value.state === 'string'
    && BACKEND_JOB_STATES.has(value.state as BackendJobData['state'])
    && typeof value.created_at === 'string'
    && typeof value.updated_at === 'string'
    && typeof value.status_url === 'string'
    && typeof value.artifact_url === 'string';
}

export function isBackendAsyncDownloadData(value: unknown): value is BackendAsyncDownloadData {
  if (!isRecord(value)) {
    return false;
  }

  return value.mode === 'async' && isBackendJobData(value.job);
}

export function isBackendExtractData(value: unknown): value is BackendExtractData {
  if (!isRecord(value) || !Array.isArray(value.media)) {
    return false;
  }

  return typeof value.url === 'string'
    && typeof value.platform === 'string'
    && typeof value.content_type === 'string'
    && value.media.every(isBackendMediaItem);
}

function isBackendMediaItem(value: unknown): value is BackendMediaItem {
  if (!isRecord(value) || !Array.isArray(value.sources)) {
    return false;
  }

  return typeof value.index === 'number'
    && Number.isFinite(value.index)
    && typeof value.type === 'string'
    && value.sources.every(isBackendMediaSource);
}

function isBackendMediaSource(value: unknown): value is BackendMediaSource {
  if (!isRecord(value) || typeof value.url !== 'string') {
    return false;
  }

  return optionalString(value.quality)
    && optionalString(value.mime_type)
    && optionalFiniteNumber(value.file_size_bytes)
    && optionalBoolean(value.is_progressive)
    && optionalBoolean(value.needs_merge)
    && (value.stream_profile === undefined || (
      typeof value.stream_profile === 'string'
      && BACKEND_STREAM_PROFILES.has(value.stream_profile as NonNullable<BackendMediaSource['stream_profile']>)
    ));
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function optionalFiniteNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}
