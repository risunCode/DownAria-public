'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Download, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type DownloaderLandingContent } from '@/modules/seo/content/downloader-pages';
import { SidebarLayout } from '@/shared/layout/Sidebar';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { resolveDownloaderSubmission } from '@/modules/downloader/services';

interface DownloaderLandingPageProps {
  page: DownloaderLandingContent;
}

export function DownloaderLandingPage({ page }: DownloaderLandingPageProps) {
  const t = useTranslations('seoLanding');
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const placeholder = useMemo(
    () => `Paste ${page.shortTitle.replace(' Downloader', '')} link here...`,
    [page.shortTitle]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submission = resolveDownloaderSubmission(url, page.platformId);
    if (!submission.ok) {
      setError(t('validUrlError'));
      return;
    }
    setError('');
    const params = new URLSearchParams({
      url: submission.url,
      platform: submission.platform,
    });
    router.push(`/?${params.toString()}`);
  };

  return (
    <SidebarLayout>
      <div className="docs-surface py-6 px-4 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-[var(--border-color)] rounded-2xl p-6 sm:p-7 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium mb-4">
              <Download className="w-3.5 h-3.5" />
              DownAria
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">
              <span className="gradient-text">{page.title}</span>
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              {page.intro}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="flex-1 min-w-0">
                  <Input
                    type="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      if (error) setError('');
                    }}
                    placeholder={placeholder}
                  />
                </div>
                <Button type="submit" className="justify-center" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  {t('openDashboard')}
                </Button>
              </div>
              {error ? (
                <div className="text-xs text-rose-400">{error}</div>
              ) : null}
            </form>
            <div className="mt-3 flex justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <span>Open DownAria Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card border border-[var(--border-color)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">{t('whyTitle')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {page.bullets.map((item) => (
                <div key={item} className="settings-surface-card p-3 rounded-xl text-sm text-[var(--text-secondary)] leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </SidebarLayout>
  );
}
