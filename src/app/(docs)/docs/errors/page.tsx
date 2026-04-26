import type { Metadata } from 'next';
import { ErrorHandlingPage } from '@/modules/docs';

export const metadata: Metadata = {
  title: 'Error Handling - DownAria Docs',
  description: 'Error response envelope, common codes, and retry guidance for Backend API integrations.',
  keywords: ['DownAria errors', 'Backend error codes', 'api retryable', 'request_id'],
  alternates: {
    canonical: '/docs/errors',
  },
  openGraph: {
    title: 'Error Handling - DownAria',
    description: 'Common API errors and handling strategy.',
  },
};

export default function Page() {
  return <ErrorHandlingPage />;
}
