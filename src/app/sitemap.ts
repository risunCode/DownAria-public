import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://downaria.vercel.app';
    const lastModified = new Date();

    const routes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/about`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/docs`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/docs/api`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/docs/faq`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/docs/changelog`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/install`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/history`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/credits`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ];

    const combinations = [
        { p: 'tiktok', t: 'video' },
        { p: 'tiktok', t: 'no-watermark' },
        { p: 'tiktok', t: 'mp3' },
        { p: 'facebook', t: 'video' },
        { p: 'facebook', t: 'reels' },
        { p: 'instagram', t: 'reels' },
        { p: 'instagram', t: 'stories' },
        { p: 'instagram', t: 'photo' },
        { p: 'twitter', t: 'video' },
        { p: 'youtube', t: 'video' },
        { p: 'youtube', t: 'mp3' },
    ];

    combinations.forEach(({ p, t }) => {
        routes.push({
            url: `${baseUrl}/download/${p}/${t}`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.9,
        });
    });

    return routes;
}
