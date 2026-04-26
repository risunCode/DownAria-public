'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Bug, Gauge, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SidebarLayout } from '@/shared/layout/Sidebar';
import { DocsNavbar } from './DocsNavbar';

const COMMON_ERRORS = [
  { code: 'invalid_request_body', kind: 'invalid_input', status: '400', retryable: 'no' },
  { code: 'extract_url_required', kind: 'invalid_input', status: '400', retryable: 'no' },
  { code: 'download_request_failed', kind: 'upstream_failure', status: '502', retryable: 'yes' },
  { code: 'download_command_failed', kind: 'download_failed', status: '500', retryable: 'yes' },
  { code: 'merge_validation_missing_audio', kind: 'merge_failed', status: '500', retryable: 'no' },
  { code: 'job_not_found', kind: 'invalid_input', status: '404', retryable: 'no' },
  { code: 'artifact_missing', kind: 'invalid_input', status: '404', retryable: 'no' },
  { code: 'timeout', kind: 'timeout', status: '504', retryable: 'yes' },
];

export function ErrorHandlingPage() {
  const t = useTranslations('docs.errors');
  return (
    <SidebarLayout>
        <div className="docs-surface py-5 sm:py-6 px-3 sm:px-4 lg:px-8 overflow-hidden w-full max-w-full">
    <div className="max-w-4xl mx-auto overflow-hidden min-w-0 w-full">
          <DocsNavbar />
                 <div className="space-y-6 overflow-hidden max-w-full">
                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-full overflow-hidden">
            <div className="glass-card border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 min-w-0 overflow-hidden max-w-full">
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                  <span className="gradient-text">{t('title')}</span>
                </h1>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  {t('description')}
                </p>
              </div>
            </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="max-w-full overflow-hidden">
                    <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 min-w-0 overflow-hidden max-w-full">
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('envelope.title')}</h2>
                </div>
  <pre className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 overflow-x-auto whitespace-pre-wrap break-words text-[11px] sm:text-xs text-[var(--text-secondary)]">{`{
  "success": false,
  "response_time_ms": 184,
  "error": {
    "kind": "download_failed",
    "code": "download_command_failed",
    "message": "download failed",
    "retryable": true,
    "request_id": "4e7bb8f2f23c42a1"
  }
}`}</pre>
              </div>
            </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-full overflow-hidden">
  <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 min-w-0 overflow-hidden max-w-full">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('commonCodes.title')}</h2>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)]">
                        <th className="py-2 pr-2">{t('commonCodes.code')}</th>
                        <th className="py-2 pr-2">{t('commonCodes.kind')}</th>
                        <th className="py-2 pr-2">{t('commonCodes.http')}</th>
                        <th className="py-2">{t('commonCodes.retryable')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMMON_ERRORS.map((item) => (
                        <tr key={item.code} className="border-b border-[var(--border-color)]/40 text-[var(--text-secondary)]">
                          <td className="py-2 pr-2 font-mono">{item.code}</td>
                          <td className="py-2 pr-2">{item.kind}</td>
                          <td className="py-2 pr-2">{item.status}</td>
                          <td className="py-2">{item.retryable}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 md:hidden">
                  {COMMON_ERRORS.map((item) => (
                        <div key={item.code} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/35 p-3 text-xs text-[var(--text-secondary)] min-w-0 overflow-hidden">
                      <div className="font-mono text-[var(--text-primary)] break-all">{item.code}</div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <div className="text-[var(--text-muted)]">{t('commonCodes.kind')}</div>
                          <div>{item.kind}</div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">{t('commonCodes.http')}</div>
                          <div>{item.status}</div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">{t('commonCodes.retryable')}</div>
                          <div>{item.retryable}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="max-w-full overflow-hidden">
              <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 min-w-0 overflow-hidden max-w-full">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Reliability Features</h2>
                </div>
                <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-[var(--bg-secondary)]/40 border border-[var(--border-color)]">
                      <div className="font-semibold text-[var(--text-primary)] mb-1">⏱️ Request Timeouts</div>
                      <div>30-second timeout on all API calls prevents hanging requests</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--bg-secondary)]/40 border border-[var(--border-color)]">
                      <div className="font-semibold text-[var(--text-primary)] mb-1">🔄 Circuit Breaker</div>
                      <div>Automatic failure detection with 5 failure threshold and 30s recovery timeout</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--bg-secondary)]/40 border border-[var(--border-color)]">
                      <div className="font-semibold text-[var(--text-primary)] mb-1">📊 Exponential Backoff</div>
                      <div>Smart polling intervals: 1s → 2s → 4s → 8s → 15s max</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--bg-secondary)]/40 border border-[var(--border-color)]">
                      <div className="font-semibold text-[var(--text-primary)] mb-1">🎯 Request Deduplication</div>
                      <div>Prevents duplicate downloads of the same item</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--bg-secondary)]/40 border border-[var(--border-color)]">
                      <div className="font-semibold text-[var(--text-primary)] mb-1">⚡ Concurrent Limiting</div>
                      <div>Max 5 concurrent batch downloads to prevent browser overwhelm</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--bg-secondary)]/40 border border-[var(--border-color)]">
                      <div className="font-semibold text-[var(--text-primary)] mb-1">💾 Memory Safety</div>
                      <div>Streaming approach for files &gt;100MB to prevent memory exhaustion</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-full overflow-hidden">
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-4 bg-gradient-to-br from-sky-500/10 to-transparent min-w-0 overflow-hidden">
                <Gauge className="w-5 h-5 text-sky-400 mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('retryRule.title')}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {t('retryRule.desc')}
                </p>
              </div>
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-4 bg-gradient-to-br from-amber-500/10 to-transparent min-w-0 overflow-hidden">
                <ShieldAlert className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('supportRule.title')}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {t('supportRule.desc')}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
