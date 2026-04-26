import type { Metadata } from 'next';
import { ApiDocsPage } from '@/modules/docs';

export const metadata: Metadata = {
  title: 'API - DownAria Docs',
  description: 'Simple API usage reference for Backend v2 with flattened JSON schema, proxy endpoints, and job management.',
  keywords: ['DownAria-API', 'api usage', 'flat schema', 'media proxy', 'x-api-key', 'extract download jobs'],
  alternates: {
    canonical: '/docs/api',
  },
  openGraph: {
    title: 'API Usage - DownAria',
    description: 'Reference for Backend v2 API: flat JSON schema, Range-capable media proxy, and async jobs.',
  },
};

export default function Page() {
  return <ApiDocsPage />;
}
