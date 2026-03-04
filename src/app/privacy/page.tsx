'use client';

import { motion } from 'framer-motion';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { Shield, Lock, Database, Cookie, Server, FileText, Github, Trash2, BadgeCheck, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function PrivacyPage() {
    const t = useTranslations('privacyPage');
    const locale = useLocale();

    const quickLinks = [
        { href: '/docs', title: t('quickLinks.documentation.title'), description: t('quickLinks.documentation.description') },
        { href: '/docs/changelog', title: t('quickLinks.changelog.title'), description: t('quickLinks.changelog.description') },
        { href: '/about', title: t('quickLinks.about.title'), description: t('quickLinks.about.description') },
    ];

    return (
        <SidebarLayout>
            <div className="docs-surface py-6 px-4 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                            {t('titlePrefix')} <span className="gradient-text">{t('titleHighlight')}</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                            {t('subtitle')}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-2">
                            {t('lastUpdated')}: {new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card border border-[var(--border-color)] rounded-2xl p-5 mb-6"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-[var(--accent-primary)]" />
                            <h2 className="font-semibold text-[var(--text-primary)]">{t('atAGlance.title')}</h2>
                        </div>
                        <div className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                            <p>{t('atAGlance.point1')}</p>
                            <p>{t('atAGlance.point2')}</p>
                            <p>{t('atAGlance.point3')}</p>
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
                                <Database className="w-4 h-4 text-[var(--accent-primary)]" />
                                {t('dataWeProcess.title')}
                            </h2>
                            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                <div className="settings-surface-card flex items-start gap-2.5 p-2.5 rounded-xl">
                                    <FileText className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                                    <p>{t('dataWeProcess.urls')}</p>
                                </div>
                                <div className="settings-surface-card flex items-start gap-2.5 p-2.5 rounded-xl">
                                    <Cookie className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                    <p>
                                        {t('dataWeProcess.cookies')}
                                    </p>
                                </div>
                                <div className="settings-surface-card flex items-start gap-2.5 p-2.5 rounded-xl">
                                    <Server className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    <p>{t('dataWeProcess.operational')}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card border border-[var(--border-color)] rounded-2xl p-5"
                        >
                            <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-[var(--accent-primary)]" />
                                {t('handlingData.title')}
                            </h2>
                            <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('handlingData.point1')}
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('handlingData.point2')}
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('handlingData.point3')}
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('handlingData.point4')}
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="glass-card border border-[var(--border-color)] rounded-2xl p-5"
                        >
                            <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <Trash2 className="w-4 h-4 text-[var(--accent-primary)]" />
                                {t('retention.title')}
                            </h2>
                            <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('retention.point1')}
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('retention.point2')}
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('retention.point3')}
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="glass-card border border-[var(--border-color)] rounded-2xl p-5"
                        >
                            <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <BadgeCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                                {t('security.title')}
                            </h2>
                            <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('security.point1')}
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('security.point2')}
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    {t('security.point3')}
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="glass-card border border-[var(--border-color)] rounded-2xl p-5 lg:col-span-2"
                        >
                            <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-[var(--accent-primary)]" />
                                {t('faq.title')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
                                <div className="settings-surface-card p-2.5 rounded-xl">
                                    <p className="font-medium text-[var(--text-primary)]">{t('faq.q1')}</p>
                                    <p className="mt-1">{t('faq.a1')}</p>
                                </div>
                                <div className="settings-surface-card p-2.5 rounded-xl">
                                    <p className="font-medium text-[var(--text-primary)]">{t('faq.q2')}</p>
                                    <p className="mt-1">{t('faq.a2')}</p>
                                </div>
                                <div className="settings-surface-card p-2.5 rounded-xl">
                                    <p className="font-medium text-[var(--text-primary)]">{t('faq.q3')}</p>
                                    <p className="mt-1">
                                        {t('faq.a3')}
                                    </p>
                                </div>
                                <div className="settings-surface-card p-2.5 rounded-xl">
                                    <p className="font-medium text-[var(--text-primary)]">{t('faq.q4')}</p>
                                    <p className="mt-1">{t('faq.a4')}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                            className="glass-card border border-[var(--border-color)] rounded-2xl p-5 lg:col-span-2"
                        >
                            <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                                {t('quickLinks.title')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        transition={{ delay: 0.3 }}
                        className="text-center mt-8 pt-6 border-t border-[var(--border-color)]"
                    >
                        <p className="text-xs text-[var(--text-muted)]">
                            {t('footer.prefix')}{' '}
                            <a
                                href="https://github.com/risunCode/DownAria"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                            >
                                <Github className="w-3 h-3" />
                                risunCode/DownAria
                            </a>
                        </p>
                    </motion.div>
                </div>
            </div>
        </SidebarLayout>
    );
}
