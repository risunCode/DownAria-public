'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Handshake, HelpCircle, Info, Settings, Shield, Zap } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { DocsNavbar } from '@/components/docs/DocsNavbar';

const highlights = [
    { icon: Zap, title: 'BFF runtime first', desc: 'Frontend runtime traffic uses signed `/api/web/*` routes.' },
    { icon: Shield, title: 'Clear response contract', desc: 'Each error includes category and metadata, so frontend handling is predictable and easier to debug.' },
    { icon: Shield, title: 'Safer cookie flow', desc: 'Use your private cookie only when needed for protected content.' },
    { icon: Settings, title: 'Easy setup', desc: 'Open Settings to manage cookies, language, theme, and cache behavior.' },
];

const quickLinks = [
    { href: '/docs/api', icon: FileText, title: 'API Reference', desc: 'Endpoint list and complete error handling guide' },
    { href: '/docs/faq', icon: HelpCircle, title: 'FAQ', desc: 'Common user and integration questions' },
    { href: '/docs/changelog', icon: FileText, title: 'Changelog', desc: 'Release timeline and notable updates' },
    { href: '/settings?tab=cookies', icon: Settings, title: 'Cookie Settings', desc: 'Open cookies tab in Settings' },
    { href: '/about', icon: Info, title: 'About DownAria', desc: 'Project story, feature overview, and ecosystem links' },
    { href: '/credits', icon: Handshake, title: 'Credits', desc: 'Acknowledgements and technology credits' },
];

export function DocsHomePage() {
    return (
        <SidebarLayout>
            <div className="docs-surface py-5 sm:py-6 px-3 sm:px-4 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <DocsNavbar />
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-6"
                        >
                            <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                                <span className="gradient-text">DownAria</span> Documentation
                            </h1>
                            <p className="text-[var(--text-muted)] max-w-2xl mx-auto text-sm leading-relaxed">
                                Learn how to use DownAria to download videos from social media platforms.
                                This guide covers runtime flow, API usage, cookie handling, and troubleshooting
                                for a fast and stable integration.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
                                <span className="px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">Mobile Friendly</span>
                                <span className="px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">Open Source</span>
                                <span className="px-2.5 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">No Registration</span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                        >
                            {highlights.map((item) => (
                                <div key={item.title} className="glass-card p-4 border border-[var(--border-color)] rounded-xl min-h-[120px]">
                                    <item.icon className="w-6 h-6 text-[var(--accent-primary)] mb-2" />
                                    <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-1">{item.title}</h3>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.14 }}
                            className="glass-card p-4 sm:p-5 border border-[var(--border-color)] rounded-xl"
                        >
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Quick runtime API path</h2>
                            <ul className="space-y-2 text-xs text-[var(--text-muted)] list-disc pl-4">
                                <li>Extract metadata with <code className="text-[var(--text-secondary)]">POST /api/web/extract</code></li>
                                <li>Preview or stream media with <code className="text-[var(--text-secondary)]">GET /api/web/proxy</code></li>
                                <li>Download file output with <code className="text-[var(--text-secondary)]">GET /api/web/download</code></li>
                                <li>Merge via YouTube URL mode or direct pair mode on <code className="text-[var(--text-secondary)]">POST /api/web/merge</code></li>
                                <li>Check server health with <code className="text-[var(--text-secondary)]">GET /health</code></li>
                            </ul>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Explore</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {quickLinks.map((link) => (
                                    <Link key={link.href} href={link.href} className="group glass-card p-4 border border-[var(--border-color)] rounded-xl hover:border-[var(--accent-primary)] transition-all min-h-[120px]">
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
                    </div>
                </div>
            </div>
        </SidebarLayout>
    );
}
