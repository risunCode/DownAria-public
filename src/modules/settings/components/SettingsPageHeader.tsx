'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SettingsPageHeaderProps {
  activeTabTitle: string;
}

export function SettingsPageHeader({ activeTabTitle }: SettingsPageHeaderProps) {
  const t = useTranslations('settings');
  const tPage = useTranslations('settingsPage');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium mb-4">
        <Settings className="w-3.5 h-3.5" />
        {tPage('badge')}
      </div>
      <AnimatePresence mode="wait">
        <motion.h1
          key={activeTabTitle}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="text-2xl sm:text-3xl font-bold mb-3"
        >
          <span className="gradient-text">{activeTabTitle || t('title')}</span>
        </motion.h1>
      </AnimatePresence>
      <p className="text-[var(--text-muted)] max-w-xl mx-auto text-sm sm:text-base">{t('subtitle')}</p>
    </motion.div>
  );
}
