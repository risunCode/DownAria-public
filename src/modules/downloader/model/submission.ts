import { type PlatformId } from '@/modules/media';

export interface DownloaderSubmission {
  url: string;
  platform: PlatformId;
}

export type DownloaderInputErrorReason =
  | 'empty'
  | 'no_url_found'
  | 'invalid_url'
  | 'unsupported_protocol';

export type DownloaderParseResult =
  | ({ ok: true } & DownloaderSubmission)
  | {
      ok: false;
      reason: DownloaderInputErrorReason;
      raw: string;
      candidateUrl: string;
      platform: PlatformId;
    };
