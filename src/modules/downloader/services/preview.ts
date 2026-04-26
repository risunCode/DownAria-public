import {
  type BackendAsyncDownloadData,
  type BackendExtractData,
  type BackendJobData,
  type BackendResponse,
  isBackendAsyncDownloadData,
  isBackendJobData,
  isBackendResponse,
} from '@/infra/api/types';
import {
  type DownloadTaskState,
  type PreviewFormat,
  type PreviewItem,
  type PreviewMediaKind,
  type PreviewResult,
} from '@/modules/downloader/model/preview';
import { formatDisplayQuality as formatDisplayQualityHelper } from '@/modules/downloader/utils/preview-helpers';
import { isRecord } from '@/shared/utils/type-guards';
import {
  buildSyntheticAudioFormats,
  dedupeAudioFormats,
  dedupeVideoFormats,
  findPreferredPreviewFormat,
  getBestAudioPartner,
} from './format-utils';
import { buildFilename, inferExtension } from './filename-utils';

export * from './format-utils';
export * from './filename-utils';
export * from './preview-history';

function formatDisplayQuality(value?: string): string {
  return formatDisplayQualityHelper(value) || 'Source';
}

function formatSourceLabel(kind: PreviewMediaKind, quality?: string, extension?: string, bitrate?: number): string {
  if (kind === 'audio') {
    const ext = extension?.toUpperCase() || 'Audio';
    if (typeof bitrate === 'number' && bitrate > 0) {
      const normalized = bitrate >= 1000 ? Math.round(bitrate / 1000) : Math.round(bitrate);
      return `${ext} ${normalized}k`;
    }

    return ext;
  }

  if (quality) {
    return formatDisplayQuality(quality);
  }

  return extension?.toUpperCase() || 'Source';
}

function hasAudioFromStreamProfile(profile: BackendExtractData['media'][number]['sources'][number]['stream_profile']): boolean {
  return profile === 'audio_only' || profile === 'muxed_progressive' || profile === 'muxed_adaptive';
}

function hasVideoFromStreamProfile(profile: BackendExtractData['media'][number]['sources'][number]['stream_profile']): boolean {
  return profile === 'video_only_adaptive'
    || profile === 'video_only_progressive'
    || profile === 'muxed_progressive'
    || profile === 'muxed_adaptive';
}

function deriveKind(itemType: string, source: BackendExtractData['media'][number]['sources'][number]): PreviewMediaKind {
  const profile = source.stream_profile;
  if (profile === 'image' || itemType === 'image') {
    return 'image';
  }
  if (profile === 'audio_only' || itemType === 'audio') {
    return 'audio';
  }
  return 'video';
}

function isHlsSource(source: BackendExtractData['media'][number]['sources'][number]): boolean {
  const url = source.url.toLowerCase();
  return url.includes('.m3u8') || url.includes('manifest');
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) {
    return 'Unknown';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatCompactNumber(value?: number): string {
  if (!value || value <= 0) {
    return '0';
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return `${value}`;
}

export function formatDuration(value?: number): string {
  if (!value || value <= 0) {
    return 'Unknown';
  }

  const totalSeconds = Math.round(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function toPreviewResult(response: BackendResponse<BackendExtractData>): PreviewResult {
  const data = response.data;
  if (!data) {
    return {
      sourceUrl: '',
      platform: 'unknown',
      contentType: 'unknown',
      title: response.error?.message || 'Unavailable media',
      engagement: {},
      items: [],
      responseTimeMs: response.response_time_ms,
      cached: response.cached,
      rawResponse: response,
    };
  }
  const items: PreviewItem[] = data.media.flatMap((item) => {
    if (item.sources.length === 0) {
      return [];
    }
    const itemId = `item-${item.index}`;
    const formats: PreviewFormat[] = item.sources.map((source, index) => {
      const kind = deriveKind(item.type, source);
      const extension = inferExtension(source.mime_type, undefined, source.url);
      const qualityLabel = kind === 'audio' ? 'Audio' : (source.quality || item.type || 'Source');

      return {
        id: `${itemId}-${index}-${extension || 'source'}`,
        itemId,
        kind,
        label: formatSourceLabel(kind, source.quality, extension, undefined),
        qualityLabel,
        sourceUrl: source.url,
        filename: item.filename,
        mimeType: source.mime_type,
        container: extension,
        protocol: isHlsSource(source) ? 'hls' : 'https',
        sizeBytes: source.file_size_bytes || item.file_size_bytes,
        durationSeconds: undefined,
        bitrate: undefined,
        hasAudio: hasAudioFromStreamProfile(source.stream_profile),
        hasVideo: hasVideoFromStreamProfile(source.stream_profile),
        isProgressive: source.is_progressive ?? (source.stream_profile === 'muxed_progressive' || source.stream_profile === 'video_only_progressive'),
        needsMerge: source.needs_merge ?? (source.stream_profile === 'video_only_adaptive'),
      };
    });

    const itemWithSynthetic: PreviewItem = {
      id: itemId,
      index: item.index,
      kind: deriveKind(item.type, item.sources[0]),
      title: item.filename || `Item ${item.index + 1}`,
      filename: item.filename,
      thumbnailUrl: item.thumbnail_url || data.thumbnail_url,
      formats,
      preferredFormatId: '',
    };

    itemWithSynthetic.formats = dedupeAudioFormats(dedupeVideoFormats([
      ...itemWithSynthetic.formats,
      ...buildSyntheticAudioFormats(itemWithSynthetic),
    ]));
    itemWithSynthetic.preferredFormatId = findPreferredPreviewFormat(itemWithSynthetic.formats, data.platform)?.id || itemWithSynthetic.formats[0]?.id || '';

    return [itemWithSynthetic];
  });

  return {
    sourceUrl: data.url,
    platform: data.platform,
    contentType: data.content_type,
    extractProfile: data.extract_profile,
    title: data.title || data.filename || data.url,
    authorName: data.author?.name,
    authorHandle: data.author?.handle,
    thumbnailUrl: data.thumbnail_url || items[0]?.thumbnailUrl,
    filename: data.filename,
    visibility: data.visibility,
    engagement: {
      views: data.engagement?.views,
      likes: data.engagement?.likes,
      comments: data.engagement?.comments,
      shares: data.engagement?.shares,
      bookmarks: data.engagement?.bookmarks,
    },
    items,
    responseTimeMs: response.response_time_ms,
    cached: response.cached,
    rawResponse: response,
  };
}

export function getPreviewItemById(result: PreviewResult, itemId: string): PreviewItem | null {
  return result.items.find((item) => item.id === itemId) || null;
}

export function getPreviewFormatById(item: PreviewItem, formatId: string): PreviewFormat | null {
  return item.formats.find((format) => format.id === formatId) || null;
}

export interface PreviewDownloadRequest {
  url?: string;
  video_url?: string;
  audio_url?: string;
  filename?: string;
  platform?: string;
  quality?: string;
  format?: string;
  audio_only?: boolean;
  async?: boolean;
}

export function buildPreviewDownloadRequest(result: PreviewResult, item: PreviewItem, format: PreviewFormat): PreviewDownloadRequest {
  const backendFilename = item.filename || result.filename;
  const fallbackTitle = `${result.title}-${item.index + 1}`;
  const filename = backendFilename
    || buildFilename(fallbackTitle, format.requestedAudioFormat || format.container || inferExtension(format.mimeType, format.container, format.sourceUrl));

  if (format.requestedAudioFormat) {
    return {
      url: format.sourceUrl,
      filename,
      platform: result.platform,
      format: format.requestedAudioFormat,
      audio_only: true,
      async: true,
    };
  }

  if (format.needsMerge) {
    const audioPartner = getBestAudioPartner(item) || getBestAudioPartner(result);
    if (!audioPartner) {
      return {
        url: format.sourceUrl,
        filename,
        platform: result.platform,
        async: true,
      };
    }

    return {
      video_url: format.sourceUrl,
      audio_url: audioPartner.sourceUrl,
      filename,
      platform: result.platform,
      format: format.container || 'mp4',
      async: true,
    };
  }

  if (format.kind === 'video' && format.protocol?.toLowerCase() === 'hls') {
    return {
      url: format.sourceUrl,
      filename,
      platform: result.platform,
      format: 'mp4',
      async: true,
    };
  }

  return {
    url: format.sourceUrl,
    filename,
    platform: result.platform,
    async: false,
  };
}

export function buildDownloadTaskKey(result: PreviewResult, item: PreviewItem, format: PreviewFormat): string {
  return `${result.sourceUrl}::${item.id}::${format.id}`;
}

export function createIdleDownloadTaskState(): DownloadTaskState {
  return { status: 'idle', progress: 0 };
}

export function statusFromJob(job: BackendJobData): DownloadTaskState {
  const progressMap: Record<BackendJobData['state'], number> = {
    pending: 12,
    downloading: 45,
    merging: 72,
    converting: 84,
    completed: 100,
    failed: 100,
    expired: 100,
    cancelled: 100,
  };

  if (job.state === 'completed') {
    return {
      status: 'completed',
      progress: 100,
      message: job.message || 'Completed',
      jobId: job.id,
      filename: job.artifact?.filename,
    };
  }

  if (job.state === 'failed' || job.state === 'expired') {
    return {
      status: 'error',
      progress: 100,
      message: job.error?.message || 'Download failed',
      error: job.error?.message || 'Download failed',
      jobId: job.id,
      filename: job.artifact?.filename,
    };
  }

  if (job.state === 'cancelled') {
    return {
      status: 'cancelled',
      progress: 0,
      message: job.message || 'Download cancelled',
      jobId: job.id,
      filename: job.artifact?.filename,
    };
  }

  return {
    status: job.state === 'pending' ? 'queued' : 'polling',
    progress: progressMap[job.state],
    message: job.message || job.state,
    jobId: job.id,
    filename: job.artifact?.filename,
  };
}

export function extractAsyncDownload(payload: unknown): BackendAsyncDownloadData | null {
  if (!isRecord(payload)) {
    return null;
  }

  const data = payload.data;
  return isBackendAsyncDownloadData(data) ? data : null;
}

export function extractJobEnvelope(payload: unknown): BackendJobData | null {
  if (!isBackendResponse(payload)) {
    return null;
  }

  return isBackendJobData(payload.data) ? payload.data : null;
}

export function extractEnvelopeError(payload: unknown): string {
  if (!isBackendResponse(payload)) {
    return 'Unexpected backend response.';
  }

  const code = payload.error?.code?.trim();
  const message = payload.error?.message || 'The backend request failed.';
  return code ? `${code}: ${message}` : message;
}
