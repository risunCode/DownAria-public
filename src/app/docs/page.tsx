import type { Metadata } from 'next';
import { DocsHomePage } from '@/app/docs/DocsHomePage';

export const metadata: Metadata = {
    title: 'Documentation - DownAria',
    description: 'Official DownAria documentation for runtime behavior, cookie handling, FAQ, and changelog.',
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
