'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { DiscordWebhookSettings } from '@/features/settings/components/DiscordWebhookSettings';
import { useTranslations } from 'next-intl';

export function IntegrationsTab() {
  const t = useTranslations('settingsTabs.integrations');

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
      <div className="glass-card p-6 rounded-2xl border border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-5 h-5 text-yellow-500" />
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('title')}</h2>
            <p className="text-xs text-[var(--text-muted)]">{t('description')}</p>
          </div>
        </div>

        <DiscordWebhookSettings />

        <div className="mt-6 p-3 rounded-xl border border-dashed border-[var(--border-color)] text-center">
          <p className="text-sm text-[var(--text-muted)]">{t('comingSoon')}</p>
        </div>
      </div>
    </motion.div>
  );
}
