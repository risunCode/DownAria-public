import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorkerRegister } from "@/components/core/ServiceWorkerRegister";
import { PendingDownloadProvider } from "@/lib/contexts/PendingDownloadContext";
import { IntlProvider } from "@/components/core/IntlProvider";
import { StructuredData } from "@/components/core/StructuredData";
import { SkipToContent } from "@/components/ui/Accessibility";
import { SeasonalEffects } from "@/components/core/SeasonalEffects";
import { ScreenSizeGuard } from "@/components/core/ScreenSizeGuard";
import { AdaptText } from "@/components/core/AdaptText";
import { ThemeColorMeta } from "@/components/core/ThemeColorMeta";
import { CacheInitializer } from "@/components/core/CacheInitializer";
import { Toaster } from "sonner";
import { BASE_URL_WITH_FALLBACK, IS_PROD, IS_VERCEL } from "@/lib/config";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL_WITH_FALLBACK),
  title: "DownAria - Free Social Media Video Downloader | Facebook, Instagram, TikTok, Twitter",
  description: "Download videos, reels, stories from Facebook, Instagram, TikTok, Twitter/X for free. No watermark, no login, unlimited downloads. Fast & easy social media downloader by risunCode.",
  keywords: [
    "downaria", "down aria", "downaria downloader", "social media downloader", "video downloader",
    "facebook downloader", "fb downloader", "facebook video downloader free", "download fb video",
    "instagram downloader", "ig downloader", "instagram reels downloader", "download instagram video",
    "tiktok downloader", "tiktok video downloader", "download tiktok without watermark",
    "twitter downloader", "x downloader", "twitter video downloader", "download twitter video",
    "no watermark downloader", "free video downloader", "online video downloader",
    "download reels", "download stories", "download shorts",
    "risuncode", "risuncode github", "github risuncode", "github/risuncode",
    "risun code", "risun", "risuncode portfolio", "surfmanager",
    // Competitor Keywords (SEO Boost)
    "ssstik", "ssstiktok", "snaptik", "snaptik app", "savefrom", "savefromnet", "savefrom.net",
    "y2mate", "fastdl", "snapinsta", "iggram", "musicallyloader", "savetik",
    "tikmate", "getfvid", "fdown", "fbdown", "twittervideodownloader"
  ],
  authors: [{ name: "risunCode", url: "https://github.com/risunCode" }, { name: "risuncode.github.io", url: "https://risuncode.github.io" }],
  creator: "risunCode",
  publisher: "risunCode",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DownAria",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "DownAria - Free Social Media Video Downloader",
    description: "Download videos from Facebook, Instagram, TikTok, Twitter/X for free. No watermark, unlimited downloads.",
    type: "website",
    images: ["/icon.png"],
    siteName: "DownAria",
  },
  twitter: {
    card: "summary",
    title: "DownAria - Free Social Media Downloader",
    description: "Download videos from Facebook, Instagram, TikTok, Twitter/X for free.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: './',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0d1117" />
        <meta name="screen-orientation" content="portrait" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('downaria-theme');if(t==='auto'||!t){var m=window.matchMedia('(prefers-color-scheme:dark)').matches;t=m?'dark':'light'}if(t)document.documentElement.className=t==='dark'?'theme-dark dark':t==='solarized'?'theme-solarized':'theme-light'}catch(e){}})()`,
          }}
        />
        <StructuredData />
      </head>
      <body
        className={`${jetbrainsMono.variable} font-mono antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]`}
      >
        <IntlProvider>
          <SkipToContent />
          <ThemeColorMeta />
          <SeasonalEffects />
          <ScreenSizeGuard />
          <AdaptText />
          <CacheInitializer />
          <PendingDownloadProvider>
            <ServiceWorkerRegister />
            {children}
          </PendingDownloadProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              },
            }}
          />
        </IntlProvider>
        {IS_PROD && IS_VERCEL && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
