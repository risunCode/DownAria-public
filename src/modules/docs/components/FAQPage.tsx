'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SidebarLayout } from '@/shared/layout/Sidebar';
import { DocsNavbar } from './DocsNavbar';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[var(--border-color)] last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} className="w-full flex items-start justify-between gap-3 py-4 text-left group">
        <span className="min-w-0 font-medium text-[var(--text-primary)] text-sm pr-2 group-hover:text-[var(--accent-primary)] transition-colors">{item.question}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pb-4 text-sm text-[var(--text-muted)] leading-relaxed">{item.answer}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function FAQPage() {
  const t = useTranslations('docs.faq');
  const faqs: { category: string; items: FAQItem[] }[] = [
    {
      category: t('categories.productBasics'),
      items: [
        { question: t('questions.whatIsDownAria.q'), answer: t('questions.whatIsDownAria.a') },
        { question: t('questions.whatLinks.q'), answer: t('questions.whatLinks.a') },
        { question: t('questions.needAccount.q'), answer: t('questions.needAccount.a') },
      ],
    },
    {
      category: t('categories.downloadBehavior'),
      items: [
        { question: t('questions.why1080pNoAudio.q'), answer: t('questions.why1080pNoAudio.a') },
        { question: t('questions.whyDifferentQuality.q'), answer: t('questions.whyDifferentQuality.a') },
        { question: t('questions.asyncMode.q'), answer: t('questions.asyncMode.a') },
      ],
    },
    {
      category: t('categories.privacyLocalData'),
      items: [
        { question: t('questions.cookiesStored.q'), answer: t('questions.cookiesStored.a') },
        { question: t('questions.historyLocal.q'), answer: t('questions.historyLocal.a') },
        { question: t('questions.controlThemes.q'), answer: t('questions.controlThemes.a') },
      ],
    },
    {
      category: t('categories.troubleshooting'),
      items: [
        { question: t('questions.extractionFails.q'), answer: t('questions.extractionFails.a') },
        { question: t('questions.qualityDuplicated.q'), answer: t('questions.qualityDuplicated.a') },
        { question: t('questions.downloadStalls.q'), answer: t('questions.downloadStalls.a') },
      ],
    },
  ];
  return (
    <SidebarLayout>
      <div className="docs-surface py-5 sm:py-6 px-3 sm:px-4 lg:px-8 overflow-hidden w-full max-w-full">
          <div className="max-w-4xl mx-auto min-w-0 w-full overflow-hidden">
          <DocsNavbar />
       <div className="space-y-6 overflow-hidden max-w-full">
       <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-full overflow-hidden">
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight"><span className="gradient-text">{t('title')}</span></h1>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">{t('description')}</p>
            </motion.div>

            {faqs.map((section, idx) => (
                         <motion.div
                 key={section.category}
                 initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.08 }}
                 className="glass-card p-4 sm:p-5 border border-[var(--border-color)] rounded-xl min-w-0 overflow-hidden max-w-full"
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
