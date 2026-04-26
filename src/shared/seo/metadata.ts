import type { Metadata } from 'next';

import { type DownloaderLandingContent } from '@/modules/seo/content/downloader-pages';

export const APP_SEO_TITLE = 'DownAria | Social Media Downloader by risunCode';
export const APP_SEO_DESCRIPTION = 'DownAria is the easy-to-use social media downloader by risunCode for saving videos, reels, stories, and short clips from Facebook, Instagram, TikTok and much more in one fast web app.';

interface BuildPageMetadataOptions {
  title: Metadata['title'];
  description: string;
  openGraphTitle?: string;
  openGraphDescription?: string;
}

export function buildPageMetadata({
  title,
  description,
  openGraphTitle,
  openGraphDescription,
}: BuildPageMetadataOptions): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: openGraphTitle ?? (typeof title === 'string' ? title : undefined),
      description: openGraphDescription ?? description,
    },
    twitter: {
      card: 'summary',
      title: openGraphTitle ?? (typeof title === 'string' ? title : undefined),
      description: openGraphDescription ?? description,
    },
  };
}

export function buildDownloaderLandingMetadata(page: DownloaderLandingContent): Metadata {
  return buildPageMetadata({
    title: `${page.title} | DownAria`,
    description: page.description,
  });
}
