import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorkerRegister } from "@/components/core/ServiceWorkerRegister";
import { IntlProvider } from "@/components/core/IntlProvider";
import { StructuredData } from "@/components/core/StructuredData";
import { SkipToContent } from "@/shared/ui/Accessibility";
import { SeasonalEffects } from "@/components/core/SeasonalEffects";
import { ScreenSizeGuard } from "@/components/core/ScreenSizeGuard";
import { AdaptText } from "@/components/core/AdaptText";
import { ThemeColorMeta } from "@/components/core/ThemeColorMeta";
import { APP_SEO_DESCRIPTION, APP_SEO_TITLE } from '@/shared/seo/metadata';
import { Toaster } from "sonner";
import { BASE_URL_WITH_FALLBACK, IS_PROD, IS_VERCEL } from "@/shared/config";
import { headers } from "next/headers";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const outfitDisplay = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const outfitUi = Outfit({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL_WITH_FALLBACK),
  title: APP_SEO_TITLE,
  description: APP_SEO_DESCRIPTION,
  keywords: [
    "downaria", "down aria", "downaria downloader", "downaria by risuncode", "social media downloader", "video downloader",
    "facebook downloader", "fb downloader", "facebook video downloader free", "download fb video",
    "instagram downloader", "ig downloader", "instagram reels downloader", "download instagram video",
    "tiktok downloader", "tiktok video downloader", "download tiktok without watermark",
    "twitter downloader", "x downloader", "twitter video downloader", "download twitter video",
    "no watermark downloader", "free video downloader", "online video downloader",
    "download reels", "download stories", "download shorts", "downaria app", "downaria web",
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
    title: APP_SEO_TITLE,
    description: APP_SEO_DESCRIPTION,
    type: "website",
    images: ["/icon.png"],
    siteName: "DownAria",
  },
  twitter: {
    card: "summary",
    title: APP_SEO_TITLE,
    description: APP_SEO_DESCRIPTION,
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0d1117" />
        <meta name="screen-orientation" content="portrait" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('downaria-theme');if(t==='auto'||!t){var m=window.matchMedia('(prefers-color-scheme:dark)').matches;t=m?'dark':'light'}if(t)document.documentElement.className=t==='dark'?'theme-dark dark':t==='solarized'?'theme-solarized':'theme-light'}catch(e){}})()`,
          }}
        />
        <StructuredData />
      </head>
      <body
        className={`${outfitDisplay.variable} ${outfitUi.variable} ${jetbrainsMono.variable} antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]`}
      >
        <IntlProvider>
          <SkipToContent />
          <ThemeColorMeta />
          <SeasonalEffects />
          <ScreenSizeGuard />
          <AdaptText />
          <ServiceWorkerRegister />
          {children}
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
