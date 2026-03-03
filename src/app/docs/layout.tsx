import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        default: 'Documentation',
        template: '%s | Docs | DownAria',
    },
    description: 'Official DownAria documentation covering current runtime behavior, FAQ, and changelog updates.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    // No separate layout - use main app layout with SidebarLayout
    return children;
}
