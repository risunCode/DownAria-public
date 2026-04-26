'use client';

import { Loader2 } from 'lucide-react';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-[var(--bg-secondary)] ${className}`} />;
}

export function DownloadPreviewSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 sm:p-4 overflow-hidden">
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <SkeletonBlock className="h-4 w-2/3" />
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-4 w-12" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-3 w-20" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:w-32 md:w-40 lg:w-48">
          <SkeletonBlock className="aspect-video w-full rounded-lg" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <SkeletonBlock className="h-7 w-16" />
            <SkeletonBlock className="h-7 w-20" />
            <SkeletonBlock className="h-7 w-16" />
          </div>
          <SkeletonBlock className="h-20 w-full rounded-lg" />
          <div className="flex gap-1.5">
            <SkeletonBlock className="h-7 w-20" />
            <SkeletonBlock className="h-7 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
