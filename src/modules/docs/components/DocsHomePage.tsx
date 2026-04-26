'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Code2, Download, FileText, Handshake, HelpCircle, Info, Settings, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PopularDownloadersSection } from '@/modules/seo';
import { SidebarLayout } from '@/shared/layout/Sidebar';
import { DocsNavbar } from './DocsNavbar';

export function DocsHomePage() {
  const t = useTranslations('docs');
  const highlights = [
    { icon: Sparkles, title: t('home.highlights.socialMedia.title'), desc: t('home.highlights.socialMedia.desc') },
    { icon: Workflow, title: t('home.highlights.fastExtraction.title'), desc: t('home.highlights.fastExtraction.desc') },
    { icon: ShieldCheck, title: t('home.highlights.localFirst.title'), desc: t('home.highlights.localFirst.desc') },
  ];
  const quickLinks = [
    { href: '/docs/api', icon: Code2, title: t('home.explore.apiUsage.title'), desc: t('home.explore.apiUsage.desc') },
    { href: '/docs/errors', icon: AlertCircle, title: t('home.explore.errorHandling.title'), desc: t('home.explore.errorHandling.desc') },
    { href: '/docs/faq', icon: HelpCircle, title: t('home.explore.faq.title'), desc: t('home.explore.faq.desc') },
    { href: '/settings', icon: Settings, title: t('home.explore.settings.title'), desc: t('home.explore.settings.desc') },
    { href: '/about', icon: Info, title: t('home.explore.about.title'), desc: t('home.explore.about.desc') },
    { href: '/credits', icon: Handshake, title: t('home.explore.credits.title'), desc: t('home.explore.credits.desc') },
  ];
  return (
    <SidebarLayout>
      <div className="docs-surface py-5 sm:py-6 px-3 sm:px-4 lg:px-8 overflow-hidden w-full max-w-full">
        <div className="max-w-4xl mx-auto min-w-0 w-full overflow-hidden">
          <DocsNavbar />
        <div className="space-y-6 overflow-hidden max-w-full">
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-6 min-w-0 overflow-hidden max-w-full">
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                <span className="gradient-text">{t('home.title')}</span>
              </h1>
              <p className="text-[var(--text-muted)] max-w-2xl mx-auto text-sm leading-relaxed">
                {t('home.description')}
              </p>
            </motion.div>

   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0 max-w-full overflow-hidden">
              {highlights.map((item) => (
                        <div key={item.title} className="glass-card p-4 border border-[var(--border-color)] rounded-xl min-h-[108px] sm:min-h-[120px] min-w-0 overflow-hidden max-w-full">
                  <item.icon className="w-6 h-6 text-[var(--accent-primary)] mb-2" />
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="glass-card p-4 sm:p-5 border border-[var(--border-color)] rounded-xl min-w-0 overflow-hidden max-w-full">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{t('home.howItWorks.title')}</h2>
              <ul className="space-y-2 text-xs text-[var(--text-muted)] list-disc pl-4">
                <li>{t('home.howItWorks.step1')}</li>
                <li>{t('home.howItWorks.step2')}</li>
                <li>{t('home.howItWorks.step3')}</li>
                <li>{t('home.howItWorks.step4')}</li>
                <li>{t('home.howItWorks.step5')}</li>
              </ul>
            </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} className="glass-card p-4 sm:p-5 border border-[var(--border-color)] rounded-xl min-w-0 overflow-hidden max-w-full">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">{t('home.platformOverview.title')}</h2>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0 max-w-full overflow-hidden">
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 min-w-0 overflow-hidden max-w-full">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">{t('home.platformOverview.input.label')}</p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{t('home.platformOverview.input.desc')}</p>
                </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 min-w-0 overflow-hidden max-w-full">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">{t('home.platformOverview.output.label')}</p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{t('home.platformOverview.output.desc')}</p>
                </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3 min-w-0 overflow-hidden max-w-full">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">{t('home.platformOverview.control.label')}</p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{t('home.platformOverview.control.desc')}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="min-w-0 max-w-full overflow-hidden">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t('home.explore.title')}</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0 max-w-full overflow-hidden">
                {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="group glass-card p-4 border border-[var(--border-color)] rounded-xl hover:border-[var(--accent-primary)] transition-all min-h-[108px] sm:min-h-[120px] min-w-0 overflow-hidden break-words max-w-full">
                    <link.icon className="w-6 h-6 text-[var(--accent-primary)] mb-2" />
                    <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1 flex items-center gap-1">
                      {link.title}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{link.desc}</p>
                  </Link>
                ))}
              </div>
            </motion.div>

               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="max-w-full overflow-hidden">
              <PopularDownloadersSection
                title={t('home.popularDownloaders.title')}
                description={t('home.popularDownloaders.description')}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
