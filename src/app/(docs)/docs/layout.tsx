import type { Metadata } from 'next';
import { buildPageMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = {
    ...buildPageMetadata({
        title: {
            default: 'Documentation',
            template: '%s | Docs | DownAria',
        },
        description: 'Official DownAria documentation covering current runtime behavior, cleanup status, and FAQ.',
    }),
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    // No separate layout - use main app layout with SidebarLayout
    return children;
}
