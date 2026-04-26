import type { Metadata } from "next";
import { buildPageMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = buildPageMetadata({
    title: "About | DownAria - Social Media Downloader Story",
    description: "Learn about DownAria, the easy-to-use social media downloader by risunCode, the story behind the project, and the tools that power the app.",
    openGraphTitle: "About DownAria | Social Media Downloader",
    openGraphDescription: "The story behind DownAria, the easy-to-use social media downloader by risunCode.",
});

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
