import { type DownloadTaskState, type PreviewFormat } from '@/modules/downloader/model/preview';

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

export function sanitizeFilenamePart(value: string | undefined, fallback: string, maxLength = 120): string {
  const cleaned = (value || '')
    .replace(INVALID_FILENAME_CHARS, '_')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .replace(/[.\s]+$/g, '');
  const safe = cleaned.length > 0 ? cleaned : fallback;
  return safe.slice(0, maxLength);
}

export function normalizeCookieSource(value: string | undefined): 'client' | 'server' | 'none' | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'client' || normalized === 'user') return 'client';
  if (normalized === 'server') return 'server';
  if (normalized === 'none') return 'none';
  return undefined;
}

export function getQualityBadge(formats: PreviewFormat[]): string | null {
  const videos = formats.filter((f) => f.kind === 'video');
  if (videos.length === 0) return null;
  const qualities = videos.map((v) => v.qualityLabel.toLowerCase());
  if (qualities.some((q) => q.includes('2160') || q.includes('4k'))) return '4K';
  if (qualities.some((q) => q.includes('1080') || q.includes('fhd'))) return 'FHD';
  if (qualities.some((q) => q.includes('720') || q.includes('hd'))) return 'HD';
  return 'SD';
}

export function taskToProgressShape(task: DownloadTaskState): {
  percent: number;
  loaded: number;
  total: number;
  speed: number;
  message?: string;
  status?: 'idle' | 'downloading' | 'converting' | 'done' | 'error';
} {
  const statusMap: Record<string, 'idle' | 'downloading' | 'converting' | 'done' | 'error'> = {
    idle: 'idle',
    preparing: 'downloading',
    downloading: 'downloading',
    queued: 'downloading',
    polling: 'downloading',
    completed: 'done',
    error: 'error',
  };
  return {
    percent: task.progress,
    loaded: 0,
    total: 0,
    speed: 0,
    message: task.message || (task.status === 'completed' ? 'Download complete!' : task.error),
    status: statusMap[task.status] || 'idle',
  };
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatSpeed(bytesPerSecond?: number): string {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 Mbps';
  const mbps = (bytesPerSecond * 8) / (1024 * 1024);
  if (mbps < 1) {
    const kbps = (bytesPerSecond * 8) / 1024;
    return `${kbps.toFixed(1)} Kbps`;
  }
  return `${mbps.toFixed(1)} Mbps`;
}

export function formatNumber(num?: number): string {
  if (!num) return '0';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

const FORCE_UPPERCASE_TOKENS = new Set([
  'hd', 'sd', 'fhd', 'uhd', '4k', '8k', 'hls',
  'mp3', 'm4a', 'aac', 'opus', 'ogg', 'wav', 'flac', 'webm',
]);

function formatDisplayWordToken(token: string): string {
  const normalized = token.trim();
  if (!normalized) return normalized;
  const lower = normalized.toLowerCase();
  if (FORCE_UPPERCASE_TOKENS.has(lower)) return lower.toUpperCase();
  if (/^\d{3,4}p$/i.test(normalized)) return normalized.toUpperCase();
  if (lower === 'audio') return 'Audio';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

export function formatDisplayQuality(value?: string): string {
  if (!value) return '';
  return value.replace(/[A-Za-z0-9]+/g, formatDisplayWordToken);
}

export const MAX_FILESIZE_MB = 892;
export const MAX_FILESIZE_LABEL = '892MB';
export const MAX_FILESIZE_BYTES = MAX_FILESIZE_MB * 1024 * 1024;
