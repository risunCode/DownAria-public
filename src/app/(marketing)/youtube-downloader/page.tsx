import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DownloaderLandingPage, getDownloaderLandingPage } from '@/modules/seo';
import { buildDownloaderLandingMetadata } from '@/shared/seo/metadata';

const page = getDownloaderLandingPage('youtube-downloader');

export const metadata: Metadata = page ? buildDownloaderLandingMetadata(page) : {};

export default function YouTubeDownloaderPage() {
  if (!page) notFound();
  return <DownloaderLandingPage page={page} />;
}
