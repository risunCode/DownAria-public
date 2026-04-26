'use client';

import { motion } from 'framer-motion';
import { Cookie, Database, Settings, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { TabId } from '@/modules/settings/hooks/useSettingsPageState';

const TABS: Array<{ id: TabId; icon: typeof Settings }> = [
  { id: 'basic', icon: Settings },
  { id: 'cookies', icon: Cookie },
  { id: 'storage', icon: Database },
  { id: 'integrations', icon: Zap },
];

interface SettingsTabsNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function SettingsTabsNav({ activeTab, onTabChange }: SettingsTabsNavProps) {
  const t = useTranslations('settingsPage');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex gap-2 p-1.5 rounded-2xl glass-card border border-[var(--border-color)] glass-nested"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-[var(--accent-primary)] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          <tab.icon className="w-4 h-4" />
          <span className="hidden sm:inline">{t(`tabs.${tab.id}.title`)}</span>
        </button>
      ))}
    </motion.div>
  );
}
