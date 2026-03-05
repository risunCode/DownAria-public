'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { DocsNavbar } from '@/components/docs/DocsNavbar';

interface FAQItem {
    question: string;
    answer: React.ReactNode;
}

const faqs: { category: string; items: FAQItem[] }[] = [
    {
        category: 'General',
        items: [
            { question: 'What is DownAria?', answer: 'DownAria is a social media downloader built with a Next.js frontend and a Go backend (DownAria-API).' },
            { question: 'Is DownAria free?', answer: 'Yes, core usage is free. Request limits and service behavior still follow backend policy.' },
            { question: 'Do I need an account to download?', answer: 'Most public posts do not need login. Private or restricted content may require your own cookie.' },
            { question: 'Is Indonesian language available?', answer: 'Yes. The UI supports EN/ID, including core docs pages such as Overview, FAQ, and Changelog.' },
        ],
    },
    {
        category: 'Public API v1',
        items: [
            { question: 'Which endpoint should I start with?', answer: 'Frontend runtime starts with signed `POST /api/web/extract`. Public `POST /api/v1/extract` is available for direct API integrations.' },
            { question: 'How do I download media files?', answer: 'Runtime download flow uses `GET /api/web/download` (or `GET /api/web/proxy` for preview/stream) with media URL from extract result.' },
            { question: 'How do I use merge for YouTube downloads?', answer: 'Primary runtime route is signed `POST /api/web/merge` with `{ url, quality?, format? }`. `POST /api/v1/merge` is conditional and non-default, only available when `WEB_INTERNAL_SHARED_SECRET` is unset.' },
            { question: 'How do I check service health?', answer: 'Use `GET /health`. Public usage stats are available at `GET /api/v1/stats/public`.' },
        ],
    },
    {
        category: 'Cookies & Privacy',
        items: [
            { question: 'When do I need cookies?', answer: 'Cookies are needed for private or restricted posts (login/age/session protected content).' },
            { question: 'What cookie format is accepted?', answer: 'Use plain header format: `name=value; name2=value2`.' },
            { question: 'Are cookies stored safely?', answer: 'Yes. Cookies are stored locally on your device and only sent securely when needed for extraction.' },
            { question: 'How does cookie lane priority work?', answer: 'Lane order is Guest -> Server -> UserProvided. The backend escalates to the next lane only when the current lane fails with auth-required errors.' },
        ],
    },
];

function FAQAccordion({ item }: { item: FAQItem }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-[var(--border-color)] last:border-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between py-4 text-left group">
                <span className="font-medium text-[var(--text-primary)] text-sm pr-4 group-hover:text-[var(--accent-primary)] transition-colors">{item.question}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="pb-4 text-sm text-[var(--text-muted)] leading-relaxed">{item.answer}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function FAQPage() {
    return (
        <SidebarLayout>
            <div className="docs-surface py-5 sm:py-6 px-3 sm:px-4 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <DocsNavbar />
                    <div className="space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">Frequently Asked <span className="gradient-text">Questions</span></h1>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed">Common user and integration questions for current Downaria runtime behavior.</p>
                        </motion.div>

                        {faqs.map((section, idx) => (
                            <motion.div
                                key={section.category}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                className="glass-card p-4 sm:p-5 border border-[var(--border-color)] rounded-xl"
                            >
                                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{section.category}</h2>
                                <div className="px-1">
                                    {section.items.map((item, i) => <FAQAccordion key={`${section.category}-${i}`} item={item} />)}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </SidebarLayout>
    );
}
