'use client';

/**
 * About Page - 2026 Refreshed Edition
 *
 * Modern, clean design showcasing DownAria features and supported platforms.
 */

import { motion } from 'framer-motion';
import { FormEvent, useMemo, useState } from 'react';
import {
  Heart,
  Github,
  FileText,
  Handshake,
  MessageSquare,
  Send,
  Video,
  Music,
  Smartphone,
  Shield,
  Bot,
  Globe,
  Lock,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { SidebarLayout } from '@/shared/layout/Sidebar';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { PopularDownloadersSection } from '@/modules/seo';

export default function AboutPage() {
  const t = useTranslations('about');
  const tPage = useTranslations('aboutPage');
  const locale = useLocale();
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const feedbackDateTime = useMemo(() => {
    return new Date().toLocaleString(locale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale]);

  async function handleFeedbackSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmittingFeedback) return;

    const name = feedbackName.trim();
    const comment = feedbackComment.trim();

    if (name.length < 2) {
      setFeedbackStatus({ type: 'error', message: tPage('feedback.errors.nameTooShort') });
      return;
    }
    if (comment.length < 3) {
      setFeedbackStatus({ type: 'error', message: tPage('feedback.errors.commentTooShort') });
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          datetime: new Date().toISOString(),
          comment,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setFeedbackStatus({ type: 'error', message: payload.error || tPage('feedback.errors.sendFailed') });
        return;
      }

      setFeedbackComment('');
      setFeedbackStatus({ type: 'success', message: tPage('feedback.success') });
    } catch {
      setFeedbackStatus({ type: 'error', message: tPage('feedback.errors.network') });
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  const features = [
    { icon: Video, title: tPage('features.video.title'), desc: tPage('features.video.description'), color: 'text-purple-400' },
    { icon: Music, title: tPage('features.audio.title'), desc: tPage('features.audio.description'), color: 'text-pink-400' },
    { icon: Smartphone, title: tPage('features.stories.title'), desc: tPage('features.stories.description'), color: 'text-orange-400' },
    { icon: Shield, title: tPage('features.noWatermark.title'), desc: tPage('features.noWatermark.description'), color: 'text-green-400' },
    { icon: Zap, title: tPage('features.fastServers.title'), desc: tPage('features.fastServers.description'), color: 'text-yellow-400' },
    { icon: Globe, title: tPage('features.api.title'), desc: tPage('features.api.description'), color: 'text-sky-400' },
  ];

  const quickLinks = [
    { href: '/docs', icon: FileText, title: tPage('quickLinks.documentation.title'), description: tPage('quickLinks.documentation.description') },
    { href: '/privacy', icon: Lock, title: tPage('quickLinks.privacy.title'), description: tPage('quickLinks.privacy.description') },
    { href: '/credits', icon: Handshake, title: tPage('quickLinks.credits.title'), description: tPage('quickLinks.credits.description') },
  ];

  return (
    <SidebarLayout>
      <div className="docs-surface py-6 px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              {t('title')} <span className="gradient-text">DownAria</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              {t('subtitle')}
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
              <h2 className="font-semibold text-[var(--text-primary)]">{t('story.title')}</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed">
              <p className="text-[var(--text-secondary)]">{t('story.p1')}</p>
              <p className="text-[var(--text-primary)] font-medium italic">{t('story.p2')}</p>
              <p className="text-[var(--text-secondary)]">{t('story.p3')}</p>
              <p className="text-[var(--text-secondary)]">
                <span className="text-[var(--accent-primary)] font-medium">{t('story.p4')}</span>
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
                <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
                {tPage('sections.features')}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {features.map((feature, i) => (
                  <div key={i} className="settings-surface-card flex items-start gap-2.5 p-2.5 rounded-xl">
                    <feature.icon className={`w-4 h-4 ${feature.color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{feature.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{feature.desc}</p>
                    </div>
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
                <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
                {tPage('sections.quickLinks')}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link, i) => (
                  <Link
                    key={i}
                    href={link.href}
                    className="nested-hover-card settings-surface-card settings-surface-card-hover flex items-start gap-2.5 p-3 rounded-xl transition-all text-[var(--text-primary)]"
                  >
                    <link.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{link.title}</p>
                      <p className="text-xs text-[var(--text-muted)] leading-tight mt-1">{link.description}</p>
                    </div>
                  </Link>
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
                <Github className="w-4 h-4 text-[var(--accent-primary)]" />
                {tPage('sections.moreProjects')}
              </h2>
              <div className="space-y-2">
                <a
                  href="https://github.com/risunCode/DownAria-public"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nested-hover-card settings-surface-card settings-surface-card-hover flex items-center gap-3 p-3 rounded-xl transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-[var(--accent-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{tPage('projects.downaria.title')}</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {tPage('projects.downaria.description')}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
                <a
                  href="https://github.com/risunCode/SurfManager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nested-hover-card settings-surface-card settings-surface-card-hover flex items-center gap-3 p-3 rounded-xl transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                    <Globe className="w-4 h-4 text-[var(--accent-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{tPage('projects.surfManager.title')}</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {tPage('projects.surfManager.description')}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
                <a
                  href="https://github.com/risunCode/SesWi-Session-Manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nested-hover-card settings-surface-card settings-surface-card-hover flex items-center gap-3 p-3 rounded-xl transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[var(--accent-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{tPage('projects.seswi.title')}</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {tPage('projects.seswi.description')}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[var(--text-muted)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="glass-card border border-[var(--border-color)] rounded-2xl p-5 mt-6"
          >
            <PopularDownloadersSection
              title="Popular Downloader Pages"
              description="Platform-focused landing pages that guide search visitors into the main DownAria dashboard."
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="glass-card border border-[var(--border-color)] rounded-2xl p-5 mt-6"
          >
            <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />
              {tPage('feedback.title')}
            </h2>

            <form onSubmit={handleFeedbackSubmit} className="feedback-surface space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="feedback-panel settings-surface-card rounded-xl p-2.5 transition-colors focus-within:border-[var(--accent-primary)]/45 focus-within:bg-[var(--bg-card)]/90">
                  <label htmlFor="feedback-name" className="block text-[11px] text-[var(--text-muted)] mb-1">{tPage('feedback.fields.name')}</label>
                  <input
                    id="feedback-name"
                    type="text"
                    maxLength={40}
                    value={feedbackName}
                    onChange={(event) => setFeedbackName(event.target.value)}
                    placeholder={tPage('feedback.placeholders.name')}
                    className="feedback-input w-full rounded-md border border-transparent focus:border-[var(--accent-primary)]/35 px-2.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors"
                  />
                </div>
                <div className="feedback-panel settings-surface-card rounded-xl p-2.5">
                  <label htmlFor="feedback-datetime" className="block text-[11px] text-[var(--text-muted)] mb-1">{tPage('feedback.fields.datetime')}</label>
                  <div
                    id="feedback-datetime"
                    className="feedback-input w-full rounded-md px-2.5 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-color)]/50"
                  >
                    {feedbackDateTime}
                  </div>
                </div>
              </div>

              <div className="feedback-panel settings-surface-card rounded-xl p-2.5 transition-colors focus-within:border-[var(--accent-primary)]/45 focus-within:bg-[var(--bg-card)]/90">
                <label htmlFor="feedback-comment" className="block text-[11px] text-[var(--text-muted)] mb-1">{tPage('feedback.fields.comment')}</label>
                <textarea
                  id="feedback-comment"
                  value={feedbackComment}
                  onChange={(event) => setFeedbackComment(event.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder={tPage('feedback.placeholders.comment')}
                  className="feedback-input w-full resize-y min-h-[120px] rounded-md border border-transparent focus:border-[var(--accent-primary)]/35 px-2.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors"
                />
                <p className={`text-[11px] mt-1 text-right ${feedbackComment.length > 450 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>{feedbackComment.length}/500</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className={`text-xs leading-relaxed ${feedbackStatus.type === 'error' ? 'text-red-400' : feedbackStatus.type === 'success' ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                  {feedbackStatus.message || tPage('feedback.hint')}
                </p>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmittingFeedback ? tPage('feedback.sending') : tPage('feedback.submit')}
                </button>
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-8 pt-6 border-t border-[var(--border-color)]"
          >
            <p className="text-xs text-[var(--text-muted)]">
              {tPage('footer.prefix')}{' '}
              <a
                href="https://github.com/risunCode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] hover:underline"
              >
                risunCode
              </a>
              {` ${tPage('footer.middle')} `}
              {new Date().getFullYear()}
            </p>
          </motion.div>
        </div>
      </div>
    </SidebarLayout>
  );
}
