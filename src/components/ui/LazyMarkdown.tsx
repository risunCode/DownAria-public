'use client';

import dynamic from 'next/dynamic';

const MarkdownRenderer = dynamic(
  () => import('./MarkdownRenderer'),
  {
    loading: () => <div className="animate-pulse h-20 bg-[var(--bg-secondary)] rounded-lg" />,
  }
);

export { MarkdownRenderer as LazyMarkdown };
