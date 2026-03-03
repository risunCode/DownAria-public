'use client';

import { motion } from 'framer-motion';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { Shield, Lock, Database, Cookie, Server, FileText, Github, Trash2, BadgeCheck, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
    const quickLinks = [
        { href: '/docs', title: 'Documentation', description: 'How extraction and downloads work' },
        { href: '/docs/changelog', title: 'Changelog', description: 'Product and policy updates' },
        { href: '/about', title: 'About DownAria', description: 'Project overview and ecosystem' },
    ];

    return (
        <SidebarLayout>
            <div className="docs-surface py-6 px-4 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                            Privacy <span className="gradient-text">Policy</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                            We keep DownAria simple: no account required, minimal stored data, and transparent handling for extraction requests.
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-2">
                            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
                            <h2 className="font-semibold text-[var(--text-primary)]">Privacy at a Glance</h2>
                        </div>
                        <div className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                            <p>No registration is required to use DownAria.</p>
                            <p>We do not permanently host downloaded media files.</p>
                            <p>You control optional cookie usage in Settings for platforms that need authentication.</p>
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
                                Data We Process
                            </h2>
                            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                                <div className="settings-surface-card flex items-start gap-2.5 p-2.5 rounded-xl">
                                    <FileText className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                                    <p>Submitted URLs and extraction metadata needed to return media formats and preview info.</p>
                                </div>
                                <div className="settings-surface-card flex items-start gap-2.5 p-2.5 rounded-xl">
                                    <Cookie className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                    <p>
                                        Optional cookies that you set in Settings for private/auth-required content, handled with separate server-side rules.
                                    </p>
                                </div>
                                <div className="settings-surface-card flex items-start gap-2.5 p-2.5 rounded-xl">
                                    <Server className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    <p>Operational stats for reliability and abuse protection (rate limiting, retry, and service health).</p>
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
                                How We Handle Data
                            </h2>
                            <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    Theme, preferences, and local history are stored on your device using browser storage.
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    Downloads are fetched from provider/CDN sources and proxied only for delivery compatibility.
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    Authentication lanes are applied in order: Guest → Server → UserProvided. Cookies from Settings are private per user, never shared with other users, and processed through a separate private path in temporary server pooling.
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    We do not sell personal data. Use this tool only for content you are authorized to access.
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
                                Retention & Deletion
                            </h2>
                            <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    Local history and preferences stay in your browser until you clear them from Settings or browser storage.
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    Temporary extraction and operational logs are rotated and retained only for reliability and abuse prevention.
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    If you provide authentication cookies, you can remove them anytime in Settings; they are not required for public content.
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
                                Security & Responsibility
                            </h2>
                            <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    We use request validation, rate limiting, and retry controls to keep the service stable and safe.
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    DownAria is intended for personal and authorized use only. You are responsible for respecting platform terms and copyright laws.
                                </p>
                                <p className="settings-surface-card p-2.5 rounded-xl">
                                    For security reports, open a private disclosure through the project repository maintainer.
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
                                Privacy FAQ
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
                                <div className="settings-surface-card p-2.5 rounded-xl">
                                    <p className="font-medium text-[var(--text-primary)]">Do I need an account?</p>
                                    <p className="mt-1">No. Core download and extraction flow works without registration.</p>
                                </div>
                                <div className="settings-surface-card p-2.5 rounded-xl">
                                    <p className="font-medium text-[var(--text-primary)]">Do you store downloaded files?</p>
                                    <p className="mt-1">No permanent hosting. Media is fetched from source/CDN and delivered for your request.</p>
                                </div>
                                <div className="settings-surface-card p-2.5 rounded-xl">
                                    <p className="font-medium text-[var(--text-primary)]">What about cookies?</p>
                                    <p className="mt-1">
                                        Cookies are optional and scoped to your own requests only. They are not shared with other users and are only kept temporarily via a private processing lane.
                                    </p>
                                </div>
                                <div className="settings-surface-card p-2.5 rounded-xl">
                                    <p className="font-medium text-[var(--text-primary)]">How can I request changes?</p>
                                    <p className="mt-1">Open an issue in the repository and include the page + policy section you want updated.</p>
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
                                Quick Links
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
                            Questions or privacy concerns? Open an issue at{' '}
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
