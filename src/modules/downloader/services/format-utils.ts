import {
  type PreviewFormat,
  type PreviewItem,
  type PreviewResult,
} from '@/modules/downloader/model/preview';

export function buildSyntheticAudioFormats(item: PreviewItem): PreviewFormat[] {
  const hasMP3 = item.formats.some((format) => format.kind === 'audio' && (format.requestedAudioFormat === 'mp3' || format.container?.toLowerCase() === 'mp3' || format.mimeType?.toLowerCase().includes('mp3')));
  const hasM4A = item.formats.some((format) => format.kind === 'audio' && (format.requestedAudioFormat === 'm4a' || format.container?.toLowerCase() === 'm4a' || format.mimeType?.toLowerCase().includes('mp4')));
  const audioCandidate = item.formats.find((format) => format.kind === 'audio')
    || item.formats.find((format) => format.kind === 'video' && format.hasAudio !== false);

  if (!audioCandidate) {
    return [];
  }

  const synthetic: PreviewFormat[] = [];

  if (!hasM4A) {
    synthetic.push({
      ...audioCandidate,
      id: `${audioCandidate.id}:m4a`,
      kind: 'audio',
      label: 'M4A 256k',
      qualityLabel: 'Audio',
      container: 'm4a',
      mimeType: 'audio/mp4',
      requestedAudioFormat: 'm4a',
      isSyntheticAudioOption: true,
      needsMerge: false,
    });
  }

  if (!hasMP3) {
    synthetic.push({
      ...audioCandidate,
      id: `${audioCandidate.id}:mp3`,
      kind: 'audio',
      label: 'MP3 256k',
      qualityLabel: 'Audio',
      container: 'mp3',
      mimeType: 'audio/mpeg',
      requestedAudioFormat: 'mp3',
      isSyntheticAudioOption: true,
      needsMerge: false,
    });
  }

  return synthetic;
}

export function formatScore(format: PreviewFormat): number {
  let score = 0;
  if (format.hasAudio) score += 1000;
  if (format.isProgressive) score += 500;
  if (!format.needsMerge) score += 200;
  if (format.sizeBytes) score += Math.min(format.sizeBytes / 1024, 500);
  if (format.bitrate) score += Math.min(format.bitrate / 10, 300);
  return score;
}

export function dedupeVideoFormats(formats: PreviewFormat[]): PreviewFormat[] {
  const seen = new Map<string, PreviewFormat>();
  for (const format of formats) {
    if (format.kind !== 'video') {
      continue;
    }
    const key = (format.qualityLabel || format.label || '').toLowerCase();
    if (!key) {
      continue;
    }
    const current = seen.get(key);
    if (!current || formatScore(format) > formatScore(current)) {
      seen.set(key, format);
    }
  }

  if (seen.size === 0) {
    return formats;
  }

  return formats.filter((format) => {
    if (format.kind !== 'video') {
      return true;
    }
    const key = (format.qualityLabel || format.label || '').toLowerCase();
    if (!key) {
      return true;
    }
    return seen.get(key) === format;
  });
}

export function dedupeAudioFormats(formats: PreviewFormat[]): PreviewFormat[] {
  const seen = new Map<string, PreviewFormat>();
  for (const format of formats) {
    if (format.kind !== 'audio') {
      continue;
    }
    const key = (format.label || format.container || format.mimeType || '').toLowerCase();
    if (!key) {
      continue;
    }
    const current = seen.get(key);
    if (!current || formatScore(format) > formatScore(current)) {
      seen.set(key, format);
    }
  }

  if (seen.size === 0) {
    return formats;
  }

  return formats.filter((format) => {
    if (format.kind !== 'audio') {
      return true;
    }
    const key = (format.label || format.container || format.mimeType || '').toLowerCase();
    if (!key) {
      return true;
    }
    return seen.get(key) === format;
  });
}

export function findPreferredPreviewFormat(formats: PreviewFormat[], platform?: string): PreviewFormat | null {
  if (formats.length === 0) {
    return null;
  }

  const videos = formats.filter((format) => format.kind === 'video');

  if (platform === 'youtube') {
    const youtubeSafe = videos.find((format) => !format.needsMerge && format.hasAudio !== false && /360p/i.test(format.qualityLabel));
    if (youtubeSafe) {
      return youtubeSafe;
    }
  }

  const progressiveVideo = videos.find((format) => format.hasAudio !== false && format.isProgressive !== false);
  if (progressiveVideo) {
    return progressiveVideo;
  }

  const mergeVideo = videos.find((format) => format.needsMerge);
  if (mergeVideo) {
    return mergeVideo;
  }

  const anyAudio = formats.find((format) => format.kind === 'audio');
  if (anyAudio) {
    return anyAudio;
  }

  const anyImage = formats.find((format) => format.kind === 'image');
  if (anyImage) {
    return anyImage;
  }

  return formats[0];
}

function collectAudioFormats(source: PreviewItem | PreviewResult): PreviewFormat[] {
  if ('items' in source) {
    return source.items.flatMap((item) => item.formats).filter((format) => format.kind === 'audio' && !format.requestedAudioFormat);
  }
  return source.formats.filter((format) => format.kind === 'audio' && !format.requestedAudioFormat);
}

function pickBestAudioFromList(audioFormats: PreviewFormat[]): PreviewFormat | null {
  if (audioFormats.length === 0) {
    return null;
  }

  const preferredExtensions = ['m4a', 'aac', 'webm', 'opus', 'mp3'];
  for (const extension of preferredExtensions) {
    const match = audioFormats.find((format) => format.container?.toLowerCase() === extension || format.mimeType?.toLowerCase().includes(extension));
    if (match) {
      return match;
    }
  }

  return audioFormats.sort((left, right) => (right.bitrate || right.sizeBytes || 0) - (left.bitrate || left.sizeBytes || 0))[0];
}

export function getBestAudioPartner(source: PreviewItem): PreviewFormat | null;
export function getBestAudioPartner(source: PreviewResult): PreviewFormat | null;
export function getBestAudioPartner(source: PreviewItem | PreviewResult): PreviewFormat | null {
  return pickBestAudioFromList(collectAudioFormats(source));
}
