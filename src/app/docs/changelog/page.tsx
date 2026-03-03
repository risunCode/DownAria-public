import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { ChangelogPage } from '@/app/docs/changelog/ChangelogPage';

export const metadata: Metadata = {
    title: 'Changelog - DownAria Docs',
    description: 'DownAria version history and release notes. See what\'s new in each update.',
    keywords: ['changelog', 'release notes', 'updates', 'version history'],
    alternates: {
        canonical: '/docs/changelog',
    },
    openGraph: {
        title: 'Changelog - DownAria',
        description: 'Version history and release notes',
    },
};

export default function Page() {
    // Fetch from the public folder during runtime/build
    const filePath = path.join(process.cwd(), 'public', 'Changelog.md');

    let fileContent = '';
    try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error('Failed to read Changelog.md:', error);
        fileContent = '# Changelog\n\nFailed to load changelog data. Please check the `public/Changelog.md` file path.';
    }

    return <ChangelogPage markdownContent={fileContent} />;
}
