import { type DownloaderFeatureStatus } from '@/modules/downloader/model/state';
import { type DownloaderInputErrorReason, type DownloaderParseResult } from '@/modules/downloader/model/submission';
import { type PlatformId } from '@/modules/media';
import { extractFirstExternalHttpUrl, normalizePossibleExternalUrl, normalizePastedText, toSafeExternalHttpUrl } from '@/shared/security/urls';
import { platformDetect, validatePublicHttpUrl } from '@/shared/utils/format';

export interface DownloaderMaintenanceConfig {
  status: DownloaderFeatureStatus;
  alternateSiteUrl: string;
}

function resolvePlatform(candidateUrl: string, fallbackPlatform: PlatformId): PlatformId {
  return platformDetect(candidateUrl) || fallbackPlatform;
}

function createInvalidResult(
  reason: DownloaderInputErrorReason,
  raw: string,
  candidateUrl: string,
  fallbackPlatform: PlatformId
): DownloaderParseResult {
  return {
    ok: false,
    reason,
    raw,
    candidateUrl,
    platform: resolvePlatform(candidateUrl, fallbackPlatform),
  };
}

export function parseDownloaderInput(rawValue: string, fallbackPlatform: PlatformId): DownloaderParseResult {
  const raw = normalizePastedText(rawValue);
  if (!raw) {
    return createInvalidResult('empty', rawValue, '', fallbackPlatform);
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    return createInvalidResult('unsupported_protocol', rawValue, raw, fallbackPlatform);
  }

  const extractedUrl = extractFirstExternalHttpUrl(raw);
  const candidateUrl = normalizePossibleExternalUrl(extractedUrl || raw);

  if (!candidateUrl) {
    return createInvalidResult('no_url_found', rawValue, '', fallbackPlatform);
  }

  if (!/^https?:\/\//i.test(candidateUrl)) {
    return createInvalidResult('unsupported_protocol', rawValue, candidateUrl, fallbackPlatform);
  }

  if (!validatePublicHttpUrl(candidateUrl)) {
    return createInvalidResult(extractedUrl ? 'invalid_url' : 'no_url_found', rawValue, candidateUrl, fallbackPlatform);
  }

  return {
    ok: true,
    url: candidateUrl,
    platform: resolvePlatform(candidateUrl, fallbackPlatform),
  };
}

export function resolveDownloaderSubmission(rawValue: string, fallbackPlatform: PlatformId): DownloaderParseResult {
  return parseDownloaderInput(rawValue, fallbackPlatform);
}

export function getDownloaderInputErrorReasonMessageKey(reason: DownloaderInputErrorReason): 'enterUrl' | 'noValidUrl' | 'invalidUrl' | 'unsupportedProtocol' {
  switch (reason) {
    case 'empty':
      return 'enterUrl';
    case 'no_url_found':
      return 'noValidUrl';
    case 'unsupported_protocol':
      return 'unsupportedProtocol';
    case 'invalid_url':
    default:
      return 'invalidUrl';
  }
}

export function extractSharedUrlCandidate(searchParams: URLSearchParams): string {
  const directUrl = searchParams.get('url');
  if (directUrl) {
    return toSafeExternalHttpUrl(directUrl) || directUrl;
  }

  const text = searchParams.get('text');
  if (text) {
    return extractFirstExternalHttpUrl(text);
  }

  const title = searchParams.get('title');
  if (title) {
    return extractFirstExternalHttpUrl(title);
  }

  return '';
}

export function getDownloaderMaintenanceConfig(): DownloaderMaintenanceConfig {
  const rawStatus = process.env.NEXT_PUBLIC_DOWNLOADER_STATUS?.trim().toLowerCase();
  const status: DownloaderFeatureStatus = rawStatus === 'paused' || rawStatus === 'limited' || rawStatus === 'ready'
    ? rawStatus
    : 'ready';

  const alternateSiteUrl = process.env.NEXT_PUBLIC_ALTERNATE_SITE_URL ?? '';

  return {
    status,
    alternateSiteUrl: toSafeExternalHttpUrl(alternateSiteUrl) || alternateSiteUrl,
  };
}
