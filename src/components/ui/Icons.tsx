'use client';

import {
    Video,
    Image,
    Music,
    Film,
    Lightbulb,
    Zap,
    Layers,
    Lock,
    ShieldHalf,
    CheckCircle2,
    Download,
    Globe,
    Clock,
    Wand2,
} from 'lucide-react';

// Platform icons — Lucide does not include brand icons.
// These are minimal hand-crafted SVG components that match the original brand shapes.

export const FacebookIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
);

export const InstagramIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
);

export const XTwitterIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

export const TiktokIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.2 8.2 0 0 0 4.79 1.52V6.79a4.85 4.85 0 0 1-1.02-.1z" />
    </svg>
);

export const WeiboIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zm5.977-10.048c-.307-.088-.516-.15-.356-.537.347-.87.382-1.62.006-2.158-.719-1.015-2.686-.96-4.935-.01 0 0-.707.308-.526-.25.347-1.12.294-2.056-.244-2.594-1.226-1.226-4.486.046-7.287 2.847C.88 9.818 0 12.4 0 14.626 0 18.864 5.378 21.5 10.646 21.5c6.943 0 11.567-4.037 11.567-7.237 0-1.934-1.628-3.033-3.09-3.527l-.048-.016zm1.027-4.9c-.763-.836-1.878-1.149-2.914-.936a.813.813 0 0 0-.636.963.818.818 0 0 0 .966.637c.517-.109 1.075.05 1.455.466.376.414.49.98.335 1.487a.815.815 0 0 0 .55 1.017.819.819 0 0 0 1.018-.549c.32-1.038.056-2.192-.774-3.085zm2.881-2.613C18.516.891 16.044.14 13.67.634a.987.987 0 0 0-.775 1.165.99.99 0 0 0 1.168.773c1.554-.326 3.192.142 4.354 1.434 1.158 1.297 1.488 3.031.95 4.588a.985.985 0 0 0 .624 1.247.988.988 0 0 0 1.249-.625c.763-2.266.303-4.844-1.257-6.654z" />
    </svg>
);

export const YoutubeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);

// Media type icons
export const VideoIcon = ({ className }: { className?: string }) => (
    <Video className={className} />
);

export const ImageIcon = ({ className }: { className?: string }) => (
    <Image className={className} />
);

export const MusicIcon = ({ className }: { className?: string }) => (
    <Music className={className} />
);

export const FilmIcon = ({ className }: { className?: string }) => (
    <Film className={className} />
);

// Feature icons
export const LightbulbIcon = ({ className }: { className?: string }) => (
    <Lightbulb className={className} />
);

export const BoltIcon = ({ className }: { className?: string }) => (
    <Zap className={className} />
);

export const LayersIcon = ({ className }: { className?: string }) => (
    <Layers className={className} />
);

export const LockIcon = ({ className }: { className?: string }) => (
    <Lock className={className} />
);

export const ShieldIcon = ({ className }: { className?: string }) => (
    // Lucide has no ShieldHalf; Shield is the closest available icon.
    <ShieldHalf className={className} />
);

export const CheckCircleIcon = ({ className }: { className?: string }) => (
    <CheckCircle2 className={className} />
);

export const DownloadIcon = ({ className }: { className?: string }) => (
    <Download className={className} />
);

export const GlobeIcon = ({ className }: { className?: string }) => (
    <Globe className={className} />
);

export const ClockIcon = ({ className }: { className?: string }) => (
    <Clock className={className} />
);

export const MagicIcon = ({ className }: { className?: string }) => (
    <Wand2 className={className} />
);

// Platform icon by ID
export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
    switch (platform) {
        case 'facebook': return <FacebookIcon className={className} />;
        case 'instagram': return <InstagramIcon className={className} />;
        case 'threads': return <InstagramIcon className={className} />;
        case 'twitter': return <XTwitterIcon className={className} />;
        case 'tiktok': return <TiktokIcon className={className} />;
        case 'weibo': return <WeiboIcon className={className} />;
        default: return <GlobeIcon className={className} />;
    }
}
