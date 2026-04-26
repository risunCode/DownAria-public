import { addHistory } from '@/infra/storage/indexed-db';
import { type BackendExtractData, type BackendResponse } from '@/infra/api/types';
import { type PlatformId } from '@/modules/media';
import {
  type PreviewFormat,
  type PreviewItem,
  type PreviewResult,
} from '@/modules/downloader/model/preview';

const KNOWN_PLATFORM_IDS = new Set<string>([
  'facebook', 'instagram', 'threads', 'twitter', 'tiktok', 'youtube',
  'bilibili', 'reddit', 'soundcloud',
  'eporner', 'pornhub', 'rule34video', 'erome', 'pixiv',
]);

export function asPlatformId(value: string): PlatformId {
  if (value && KNOWN_PLATFORM_IDS.has(value)) {
    return value as PlatformId;
  }
  return 'unknown' as PlatformId;
}

export async function persistPreviewHistory(result: PreviewResult, item: PreviewItem, format: PreviewFormat): Promise<void> {
  await addHistory({
    platform: asPlatformId(result.platform),
    contentId: result.sourceUrl,
    resolvedUrl: result.sourceUrl,
    title: result.title,
    thumbnail: item.thumbnailUrl || result.thumbnailUrl || '',
    author: result.authorName || result.authorHandle || 'Unknown',
    quality: format.label,
    type: format.kind,
  });
}

export async function persistExtractHistory(response: BackendResponse<BackendExtractData>): Promise<void> {
  const data = response.data;
  if (!data) {
    return;
  }

  const firstMedia = data.media[0];
  const firstSource = firstMedia?.sources[0];
  const kind = firstMedia?.type === 'audio' || firstMedia?.type === 'image' ? firstMedia.type : 'video';
  const quality = firstSource?.quality?.trim() || 'Preview';

  await addHistory({
    platform: asPlatformId(data.platform),
    contentId: data.url,
    resolvedUrl: data.url,
    title: data.title || data.filename || data.url,
    thumbnail: data.thumbnail_url || firstMedia?.thumbnail_url || '',
    author: data.author?.name || data.author?.handle || 'Unknown',
    quality,
    type: kind,
  });
}
