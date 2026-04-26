import { BASE_URL_WITH_FALLBACK } from '@/shared/config';
import { DOWNLOADER_LANDING_PAGES } from '@/modules/seo';
import { APP_SEO_DESCRIPTION } from '@/shared/seo/metadata';

// Structured Data (JSON-LD) for SEO
export function StructuredData() {
    const navigationLinks = [
        { name: 'Home', url: BASE_URL_WITH_FALLBACK },
        { name: 'About', url: `${BASE_URL_WITH_FALLBACK}/about` },
        { name: 'Documentation', url: `${BASE_URL_WITH_FALLBACK}/docs` },
        ...DOWNLOADER_LANDING_PAGES.map((page) => ({
            name: page.title,
            url: `${BASE_URL_WITH_FALLBACK}/${page.slug}`,
        })),
    ];

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'DownAria',
        alternateName: ['Down Aria', 'DownAria Downloader'],
        description: APP_SEO_DESCRIPTION,
        url: BASE_URL_WITH_FALLBACK,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Any',
        creator: {
            '@type': 'Person',
            name: 'risunCode',
            url: 'https://risuncode.github.io',
            sameAs: ['https://github.com/risunCode']
        },
        author: {
            '@type': 'Person',
            name: 'risunCode'
        },
        brand: {
            '@type': 'Brand',
            name: 'DownAria'
        },
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '1000',
            bestRating: '5',
            worstRating: '1',
        },
        featureList: [
            'DownAria social media downloader',
            'Download Facebook videos',
            'Download Instagram reels and stories',
            'Download TikTok videos without watermark',
            'Download Twitter/X videos',
            'Download Weibo videos',
            'No registration required',
            'Free unlimited downloads',
            'Multiple quality options',
            'PWA support',
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebSite',
                        name: 'DownAria',
                        url: BASE_URL_WITH_FALLBACK,
                    }),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'ItemList',
                        name: 'DownAria Site Navigation',
                        itemListElement: navigationLinks.map((item, index) => ({
                            '@type': 'SiteNavigationElement',
                            position: index + 1,
                            name: item.name,
                            url: item.url,
                        })),
                    }),
                }}
            />
        </>
    );
}

// FAQ Structured Data
export function FAQStructuredData() {
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: 'Is DownAria free to use?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes, DownAria is completely free to use. No registration or payment required.',
                },
            },
            {
                '@type': 'Question',
                name: 'Which platforms does DownAria support?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'DownAria supports Facebook, Instagram, TikTok, Twitter/X, and Weibo video downloads.',
                },
            },
            {
                '@type': 'Question',
                name: 'Can I download videos without watermark?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes, DownAria provides watermark-free downloads when available from the source platform.',
                },
            },
            {
                '@type': 'Question',
                name: 'Do I need to install anything?',
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'No installation required. DownAria works directly in your browser. You can also install it as a PWA for offline access.',
                },
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
    );
}

// Breadcrumb Structured Data
export function BreadcrumbStructuredData({ items }: { items: { name: string; url: string }[] }) {
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
    );
}
