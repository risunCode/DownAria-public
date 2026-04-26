'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Code2, Globe, KeyRound, ListTree, Route, TimerReset, Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SidebarLayout } from '@/shared/layout/Sidebar';
import { DocsNavbar } from './DocsNavbar';

type EndpointDoc = {
  method: string;
  path: string;
  note: string;
  request?: string;
  response?: string;
};

const AVAILABLE_ENDPOINTS: Omit<EndpointDoc, 'note'>[] = [
  {
    method: 'POST',
    path: '/api/v1/extract',
    request: `{
  "url": "https://www.instagram.com/reel/ABC123/"
}`,
    response: `{
  "success": true,
  "data": {
    "url": "https://www.instagram.com/reel/ABC123/",
    "platform": "instagram",
    "extract_profile": "native",
    "content_type": "video",
    "title": "Example Reel",
    "media": [{
      "index": 0,
      "type": "video",
      "sources": [{
        "quality": "720p",
        "url": "...",
        "stream_profile": "muxed_progressive"
      }]
    }]
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/download',
    request: `{
  "url": "https://cdn-source/video.mp4",
  "platform": "instagram",
  "filename": "my_file.mp4"
}`,
    response: `{
  "success": true,
  "data": {
    "mode": "async",
    "job": {
      "id": "job_123",
      "status_url": "/api/v1/jobs/job_123",
      "artifact_url": "/api/v1/jobs/job_123/artifact"
    }
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/merge',
    request: `{
  "video_url": "https://cdn-source/video-only.mp4",
  "audio_url": "https://cdn-source/audio.m4a",
  "filename": "merged.mp4",
  "format": "mp4"
}`,
    response: `{
  "success": true,
  "data": {
    "mode": "sync"
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/convert',
    request: `{
  "url": "https://cdn-source/audio.m4a",
  "format": "mp3",
  "audio_only": true
}`,
    response: `{
  "success": true,
  "data": {
    "mode": "sync"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/jobs/{id}',
    response: `{
  "success": true,
  "data": {
    "id": "job_123",
    "state": "completed",
    "artifact_url": "/api/v1/jobs/job_123/artifact"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/jobs/{id}/artifact',
  },
  {
    method: 'GET',
    path: '/api/v1/proxy',
    request: `?url=https://cdn-source/video.mp4`,
  },
];

function EndpointCard({
  endpoint,
  isOpen,
  onToggle,
  requestLabel,
  responseLabel,
  binaryNote,
}: {
  endpoint: EndpointDoc;
  isOpen: boolean;
  onToggle: () => void;
  requestLabel: string;
  responseLabel: string;
  binaryNote: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/35 p-3 min-w-0 overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="inline-flex w-fit items-center justify-center min-w-12 px-2 py-0.5 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-semibold text-xs">
                {endpoint.method}
              </span>
              <span className="font-mono text-[11px] sm:text-xs break-all text-[var(--text-primary)] overflow-hidden">{endpoint.path}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 pr-2">{endpoint.note}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-[var(--border-color)] pt-3">
              {endpoint.request ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] mb-2">{requestLabel}</p>
                        <pre className="max-h-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 overflow-auto whitespace-pre-wrap break-words text-[11px] sm:text-xs text-[var(--text-secondary)]">{endpoint.request}</pre>
                </div>
              ) : null}
              {endpoint.response ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] mb-2">{responseLabel}</p>
              <pre className="max-h-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 overflow-auto whitespace-pre-wrap break-words text-[11px] sm:text-xs text-[var(--text-secondary)]">{endpoint.response}</pre>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">{binaryNote}</p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ApiDocsPage() {
  const t = useTranslations('docs.api');
  const [openPath, setOpenPath] = useState<string>('/api/v1/extract');
  const endpointNotes: Record<string, string> = {
    '/api/v1/extract': t('endpoints.extract.note'),
    '/api/v1/download': t('endpoints.download.note'),
    '/api/v1/merge': t('endpoints.merge.note'),
    '/api/v1/convert': t('endpoints.convert.note'),
    '/api/v1/jobs/{id}': t('endpoints.jobStatus.note'),
    '/api/v1/jobs/{id}/artifact': t('endpoints.jobArtifact.note'),
    '/api/v1/proxy': t('endpoints.proxy.note'),
  };
  const endpoints: EndpointDoc[] = AVAILABLE_ENDPOINTS.map((endpoint) => ({
    ...endpoint,
    note: endpointNotes[endpoint.path] || '',
  }));

  return (
    <SidebarLayout>
    <div className="docs-surface py-5 sm:py-6 px-3 sm:px-4 lg:px-8 overflow-hidden w-full max-w-full">
    <div className="max-w-4xl mx-auto overflow-hidden min-w-0 w-full">
          <DocsNavbar />
 <div className="space-y-6 overflow-hidden max-w-full">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-full overflow-hidden">
    <div className="glass-card border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 max-w-full overflow-hidden">
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                  <span className="gradient-text">{t('title')}</span>
                </h1>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  {t('description')}
                </p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-0 max-w-full overflow-hidden">
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-3.5 sm:p-4 bg-gradient-to-br from-blue-500/10 to-transparent min-w-0 overflow-hidden">
                <Route className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('mainSurface.title')}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {t('mainSurface.desc')}
                </p>
              </div>
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-3.5 sm:p-4 bg-gradient-to-br from-violet-500/10 to-transparent min-w-0 overflow-hidden">
                <Workflow className="w-5 h-5 text-violet-400 mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('downloadModes.title')}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {t('downloadModes.desc')}
                </p>
              </div>
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-3.5 sm:p-4 bg-gradient-to-br from-emerald-500/10 to-transparent min-w-0 overflow-hidden">
                <TimerReset className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('clientRule.title')}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {t('clientRule.desc')}
                </p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="max-w-full overflow-hidden">
                     <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 min-w-0 overflow-hidden max-w-full">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('baseUrl.title')}</h2>
                </div>
               <pre className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 overflow-x-auto whitespace-pre-wrap break-words text-[11px] sm:text-xs text-[var(--text-secondary)]">{`http://localhost:8080`}</pre>
                <p className="text-xs text-[var(--text-muted)] mt-2">{t('baseUrl.note')}</p>
              </div>
            </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="max-w-full overflow-hidden">
   <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 min-w-0 overflow-hidden max-w-full">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('requestHeader.title')}</h2>
                </div>
                  <pre className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 overflow-x-auto whitespace-pre-wrap break-words text-[11px] sm:text-xs text-[var(--text-secondary)]">{`No auth header required`}</pre>
                <p className="text-xs text-[var(--text-muted)] mt-2">{t('requestHeader.note')}</p>
              </div>
            </motion.div>

               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="max-w-full overflow-hidden">
  <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 min-w-0 overflow-hidden max-w-full">
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('flowOverview.title')}</h2>
                </div>
                <ol className="space-y-2 text-sm text-[var(--text-secondary)] list-decimal pl-5">
                  <li>{t('flowOverview.step1')}</li>
                  <li>{t('flowOverview.step2')}</li>
                  <li>{t('flowOverview.step3')}</li>
                  <li>{t('flowOverview.step4')}</li>
                </ol>
              </div>
            </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} className="max-w-full overflow-hidden">
              <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 min-w-0 overflow-hidden max-w-full">
                <div className="flex items-center gap-2 mb-3">
                  <ListTree className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('endpoints.title')}</h2>
                </div>
                <div className="space-y-2">
                  {endpoints.map((endpoint) => (
                    <EndpointCard
                      key={`${endpoint.method}-${endpoint.path}`}
                      endpoint={endpoint}
                      isOpen={openPath === endpoint.path}
                      onToggle={() => setOpenPath(openPath === endpoint.path ? '' : endpoint.path)}
                      requestLabel={t('endpoints.request')}
                      responseLabel={t('endpoints.response')}
                      binaryNote={t('endpoints.binaryNote')}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
