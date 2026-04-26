import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomePage } from '@/modules/downloader';
import { PlatformId } from '@/modules/media';

type Props = {
    params: Promise<{
        platform: string;
        type: string;
    }>;
};

function safeJsonLdStringify(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

// Helper to format text (e.g., "tiktok" -> "TikTok")
function formatPlatformName(p: string): string {
    const map: Record<string, string> = {
        tiktok: 'TikTok',
        facebook: 'Facebook',
        instagram: 'Instagram',
        twitter: 'Twitter/X',
        youtube: 'YouTube'
    };
    return map[p.toLowerCase()] || p.charAt(0).toUpperCase() + p.slice(1);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { platform, type } = await params;
    const pName = formatPlatformName(platform);
    const tName = type.charAt(0).toUpperCase() + type.slice(1);
    const currentYear = new Date().getFullYear();

    return {
        title: `Download ${pName} ${tName} - No Watermark & Free ${currentYear} | DownAria`,
        description: `Best online ${pName} ${tName} downloader. Save ${pName} videos in HD/4K without watermark. Fast, free, and no login required.`,
        keywords: [
            `${platform} downloader`,
            `download ${platform} ${type}`,
            `${platform} ${type} saver`,
            `${platform} to mp4`,
            `save ${platform} ${type}`,
            `download ${platform} no watermark`,
            'online video downloader',
            'free downloader',
            'risuncode',
            'surfmanager'
        ],
        openGraph: {
            title: `Download ${pName} ${tName} - Fast & Free`,
            description: `Save ${pName} videos without watermark in highest quality.`,
            type: 'website',
        }
    };
}

export default async function Page({ params }: Props) {
    const { platform } = await params;

    const validPlatforms: PlatformId[] = ['tiktok', 'facebook', 'instagram', 'twitter', 'youtube'];
    if (!validPlatforms.includes(platform as PlatformId)) {
        notFound();
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: safeJsonLdStringify({
                        "@context": "https://schema.org",
                        "@type": "HowTo",
                        "name": `How to Download ${formatPlatformName(platform)} ${platform === 'instagram' ? 'Reels' : 'Videos'}`,
                        "description": `Step-by-step guide to download ${platform} content.`,
                        "step": [
                            {
                                "@type": "HowToStep",
                                "name": "Copy Link",
                                "text": `Copy the link of the ${platform} video you want to download.`
                            },
                            {
                                "@type": "HowToStep",
                                "name": "Paste Link",
                                "text": "Paste the link into the input box on DownAria."
                            },
                            {
                                "@type": "HowToStep",
                                "name": "Download",
                                "text": "Click the Download button and choose your preferred quality."
                            }
                        ]
                    })
                }}
            />
            <HomePage />
        </>
    );
}
