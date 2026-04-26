export type PreviewMediaKind = 'video' | 'audio' | 'image';

export interface PreviewFormat {
  id: string;
  itemId: string;
  kind: PreviewMediaKind;
  label: string;
  qualityLabel: string;
  sourceUrl: string;
  filename?: string;
  mimeType?: string;
  container?: string;
  protocol?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  bitrate?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
  isProgressive?: boolean;
  needsMerge: boolean;
  requestedAudioFormat?: 'mp3' | 'm4a';
  isSyntheticAudioOption?: boolean;
}

export interface PreviewItem {
  id: string;
  index: number;
  kind: PreviewMediaKind;
  title: string;
  filename?: string;
  thumbnailUrl?: string;
  formats: PreviewFormat[];
  preferredFormatId: string;
}

export interface PreviewResult {
  sourceUrl: string;
  platform: string;
  contentType: string;
  extractProfile?: string;
  title: string;
  authorName?: string;
  authorHandle?: string;
  thumbnailUrl?: string;
  filename?: string;
  visibility?: string;
  engagement: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    bookmarks?: number;
  };
  items: PreviewItem[];
  // Envelope-level metadata (from BackendResponse)
  responseTimeMs?: number;
  cached?: boolean;
  rawResponse?: unknown;
  cookieSource?: 'client' | 'server' | 'none';
  usedCookie?: boolean;
  publicContent?: boolean;
}

export type DownloadTaskStatus = 'idle' | 'preparing' | 'downloading' | 'queued' | 'polling' | 'completed' | 'error' | 'cancelled';

export interface DownloadTaskState {
  status: DownloadTaskStatus;
  progress: number;
  message?: string;
  jobId?: string;
  filename?: string;
  error?: string;
}
