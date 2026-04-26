'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { DOWNLOADER_LANDING_PAGES } from '@/modules/seo/content/downloader-pages';

interface PopularDownloadersSectionProps {
  title?: string;
  description?: string;
}

export function PopularDownloadersSection({
  title = 'Popular Downloaders',
  description = 'Explore 1000+ supported platforms and jump into the main DownAria dashboard.',
}: PopularDownloadersSectionProps) {
  return (
    <div className="glass-card relative overflow-hidden border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 min-w-0 max-w-full">
      <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,93,74,0.22)_0%,rgba(232,93,74,0.08)_45%,transparent_72%)]" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.14)_0%,rgba(59,130,246,0.06)_42%,transparent_72%)]" />
      <h2 className="relative z-[1] text-lg font-semibold text-[var(--text-primary)] mb-2 break-words">{title}</h2>
      <p className="relative z-[1] text-sm text-[var(--text-muted)] mb-4 break-words">{description}</p>
      <div className="relative z-[1] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0 max-w-full">
        {DOWNLOADER_LANDING_PAGES.map((page) => (
          <Link
            key={page.slug}
            href={`/${page.slug}`}
     className="group settings-surface-card p-3.5 sm:p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-primary)]/65 hover:bg-[linear-gradient(135deg,rgba(232,93,74,0.22),rgba(232,93,74,0.08)_35%,transparent_62%)] transition-all min-w-0 max-w-full overflow-hidden"
          >
                 <div className="flex items-start justify-between gap-2 min-w-0 max-w-full">
                   <span className="font-medium text-[var(--text-primary)] text-sm break-words min-w-0 max-w-full overflow-hidden">{page.shortTitle}</span>
              <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed line-clamp-2 break-words">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
