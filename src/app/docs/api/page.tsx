import type { Metadata } from 'next';
import { ApiDocsPage } from '@/app/docs/api/ApiDocsPage';

export const metadata: Metadata = {
  title: 'API - DownAria Docs',
  description: 'Complete DownAria API endpoint and error handling reference based on current backend implementation.',
  keywords: ['DownAria API', 'endpoint reference', 'error codes', 'api v1 extract proxy merge'],
  alternates: {
    canonical: '/docs/api',
  },
  openGraph: {
    title: 'API Reference - DownAria',
    description: 'Endpoints, categories, and error handling guide for DownAria API.',
  },
};

export default function Page() {
  return <ApiDocsPage />;
}
