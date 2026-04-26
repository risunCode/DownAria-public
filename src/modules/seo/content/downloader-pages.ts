import { type PlatformId } from '@/modules/media';

export interface DownloaderLandingContent {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  bullets: string[];
  platformId: PlatformId;
}

export const DOWNLOADER_LANDING_PAGES: DownloaderLandingContent[] = [
  {
    slug: 'facebook-downloader',
    title: 'Facebook Downloader',
    shortTitle: 'Facebook Downloader',
    description: 'Use DownAria Facebook Downloader to save Facebook videos, reels, and clips in one fast web app.',
    intro: 'The DownAria Facebook Downloader page helps people looking for a Facebook video downloader find the main DownAria dashboard quickly.',
    bullets: ['Save Facebook videos and short clips', 'Reach the main DownAria dashboard in one click', 'Brand-focused page for Facebook downloader searches'],
    platformId: 'facebook',
  },
  {
    slug: 'instagram-downloader',
    title: 'Instagram Downloader',
    shortTitle: 'Instagram Downloader',
    description: 'Use DownAria Instagram Downloader to access the main dashboard for reels, posts, stories, and clips.',
    intro: 'The DownAria Instagram Downloader page gives Instagram-focused searchers a direct path to the main dashboard.',
    bullets: ['Designed for Instagram downloader searches', 'Highlights reels, posts, and stories', 'Direct call-to-action to the main dashboard'],
    platformId: 'instagram',
  },
  {
    slug: 'tiktok-downloader',
    title: 'TikTok Downloader',
    shortTitle: 'TikTok Downloader',
    description: 'Use DownAria TikTok Downloader to reach the main dashboard for TikTok videos and short clips.',
    intro: 'The DownAria TikTok Downloader page supports TikTok-related queries and guides visitors into the main app.',
    bullets: ['Built for TikTok downloader intent', 'Points visitors to the main DownAria dashboard', 'Supports a clearer sitelink structure'],
    platformId: 'tiktok',
  },
  {
    slug: 'twitter-downloader',
    title: 'Twitter Downloader',
    shortTitle: 'Twitter Downloader',
    description: 'Use DownAria Twitter Downloader to open the main dashboard for Twitter/X videos and clips.',
    intro: 'The DownAria Twitter Downloader page helps searchers looking for Twitter or X video tools find the dashboard faster.',
    bullets: ['Covers Twitter and X video downloader intent', 'Direct link to the main dashboard', 'Supports brand-first search visibility'],
    platformId: 'twitter',
  },
  {
    slug: 'youtube-downloader',
    title: 'YouTube Downloader',
    shortTitle: 'YouTube Downloader',
    description: 'Use DownAria YouTube Downloader to access the main dashboard for YouTube videos and clips.',
    intro: 'The DownAria YouTube Downloader page gives YouTube-focused visitors a branded route into the main app.',
    bullets: ['Targets YouTube downloader searches', 'Keeps the route lightweight and easy to crawl', 'Large CTA back to the main dashboard'],
    platformId: 'youtube',
  },
  {
    slug: 'pixiv-downloader',
    title: 'Pixiv Downloader',
    shortTitle: 'Pixiv Downloader',
    description: 'Use DownAria Pixiv Downloader to access the main dashboard from Pixiv-focused searches.',
    intro: 'The DownAria Pixiv Downloader page gives Pixiv-focused search traffic a clean entry into the app.',
    bullets: ['Built for Pixiv downloader intent', 'Thin SEO page with direct dashboard CTA', 'Supports search sitelink clarity'],
    platformId: 'pixiv',
  },
];

export function getDownloaderLandingPage(slug: string): DownloaderLandingContent | undefined {
  return DOWNLOADER_LANDING_PAGES.find((page) => page.slug === slug);
}
