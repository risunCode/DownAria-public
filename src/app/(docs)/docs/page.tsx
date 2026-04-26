import type { Metadata } from 'next';
import { DocsHomePage } from '@/modules/docs';

export const metadata: Metadata = {
    title: 'Documentation - DownAria',
    description: 'Official DownAria documentation for runtime behavior, cleanup status, and FAQ.',
    keywords: ['DownAria docs', 'runtime documentation', 'social media downloader', 'FAQ'],
    alternates: {
        canonical: '/docs',
    },
    openGraph: {
        title: 'DownAria Documentation',
        description: 'Runtime docs aligned with the current BringAlive Downaria setup',
        type: 'website',
    },
};

export default function DocsPage() {
    return <DocsHomePage />;
}
