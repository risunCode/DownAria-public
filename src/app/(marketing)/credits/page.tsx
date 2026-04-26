'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { SidebarLayout } from '@/shared/layout/Sidebar';
import { Bot, Code2, Cpu, Github, Handshake, Heart, Layers, Lock, Wrench } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CreditsPage() {
  const t = useTranslations('creditsPage');

  const quickLinks = [
    { href: '/about', title: t('quickLinks.about.title'), description: t('quickLinks.about.description') },
    { href: '/docs', title: t('quickLinks.documentation.title'), description: t('quickLinks.documentation.description') },
    { href: '/privacy', title: t('quickLinks.privacy.title'), description: t('quickLinks.privacy.description') },
  ];

  const frontendStack = [t('stacks.frontend.next'), t('stacks.frontend.react'), t('stacks.frontend.typescript'), t('stacks.frontend.tailwind'), t('stacks.frontend.framer'), t('stacks.frontend.lucide')];
  const backendStack = [t('stacks.backend.go'), t('stacks.backend.chi'), t('stacks.backend.ffmpeg'), t('stacks.backend.ytdlp'), t('stacks.backend.extractors'), t('stacks.backend.proxy')];
  const tools = [t('stacks.tools.vitest'), t('stacks.tools.eslint'), t('stacks.tools.gotest'), t('stacks.tools.github'), t('stacks.tools.vscode')];

  return (
    <SidebarLayout>
      <div className="docs-surface py-6 px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="gradient-text">{t('titleHighlight')}</span> {t('titleSuffix')}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              {t('subtitleLine1')}
              {t('subtitleLine2')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card border border-[var(--border-color)] rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-red-400" />
              <h2 className="font-semibold text-[var(--text-primary)]">{t('builtBy.title')}</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed">
              <p className="text-[var(--text-secondary)]">
                {t('builtBy.description')}
              </p>
              <p className="text-[var(--text-secondary)]">
                {t('builtBy.repositoryLabel')}: <a href="https://github.com/risunCode/DownAria" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">github.com/risunCode/DownAria</a>
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-5"
            >
              <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                {t('sections.frontend')}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {frontendStack.map((item) => (
                  <div key={item} className="settings-surface-card flex items-center gap-2 p-2.5 rounded-xl">
                    <Code2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <p className="text-xs text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-5"
            >
              <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--accent-primary)]" />
                {t('sections.backend')}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {backendStack.map((item) => (
                  <div key={item} className="settings-surface-card flex items-center gap-2 p-2.5 rounded-xl">
                    <Bot className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <p className="text-xs text-[var(--text-secondary)]">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-5"
            >
              <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[var(--accent-primary)]" />
                {t('sections.tools')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tools.map((item) => (
                  <div key={item} className="settings-surface-card flex items-center gap-2.5 p-2.5 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/80 flex-shrink-0" />
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-5"
            >
              <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Handshake className="w-4 h-4 text-[var(--accent-primary)]" />
                {t('sections.license')}
              </h2>
              <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                <p className="settings-surface-card p-2.5 rounded-xl">
                  {t('licenseNotes.point1')}
                </p>
                <p className="settings-surface-card p-2.5 rounded-xl">
                  {t('licenseNotes.point2')}
                </p>
                <p className="settings-surface-card p-2.5 rounded-xl">
                  {t('licenseNotes.point3')}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-5 lg:col-span-2"
            >
              <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--accent-primary)]" />
                {t('quickLinks.title')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="nested-hover-card settings-surface-card settings-surface-card-hover flex items-start gap-2.5 p-3 rounded-xl transition-all text-[var(--text-primary)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{link.title}</p>
                      <p className="text-xs text-[var(--text-muted)] leading-tight mt-1">{link.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-8 pt-6 border-t border-[var(--border-color)]"
          >
            <p className="text-xs text-[var(--text-muted)]">
              <a
                href="https://github.com/risunCode/DownAria"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
              >
                <Github className="w-3 h-3" />
                risunCode/DownAria
              </a>
              {' • © '}
              {new Date().getFullYear()}
            </p>
          </motion.div>
        </div>
      </div>
    </SidebarLayout>
  );
}
