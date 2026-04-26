'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Cookie, ExternalLink, Info, KeyRound, Loader2, ShieldCheck, Trash2, X } from 'lucide-react';
import { FacebookIcon, InstagramIcon, XTwitterIcon, YoutubeIcon } from '@/shared/ui/Icons';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import { type CookiePlatform } from '@/modules/settings/services';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PLATFORMS: Array<{
  id: CookiePlatform;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'facebook', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: FacebookIcon },
  { id: 'instagram', color: 'text-pink-500', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30', icon: InstagramIcon },
  { id: 'twitter', color: 'text-sky-400', bgColor: 'bg-sky-400/10', borderColor: 'border-sky-400/30', icon: XTwitterIcon },
  { id: 'youtube', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: YoutubeIcon },
];

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CookiesTabProps {
  userCookies: Record<CookiePlatform, boolean>;
  editPlatform: CookiePlatform | null;
  editValue: string;
  isClearing: string | null;
  onEditPlatform: (platform: CookiePlatform | null) => void;
  onEditValueChange: (value: string) => void;
  onSaveCookie: (platform: CookiePlatform) => void;
  onClearCookie: (platform: CookiePlatform) => void;
  onClearAllCookies: () => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CookiesTab({
  userCookies,
  editPlatform,
  editValue,
  isClearing,
  onEditPlatform,
  onEditValueChange,
  onSaveCookie,
  onClearCookie,
  onClearAllCookies,
}: CookiesTabProps) {
  const t = useTranslations('settingsTabs.cookies');
  const tPlatforms = useTranslations('platforms');
  const [guideOpen, setGuideOpen] = useState(false);
  const activeCookieCount = PLATFORMS.filter(platform => userCookies[platform.id]).length;

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">

      {/* Security, Privacy, and Priority Notice */}
      <div className="glass-card relative overflow-hidden rounded-2xl border border-[var(--border-color)]">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium text-[var(--text-primary)]">{t('security.title')}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {t('security.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Cookies Card */}
      <div className="glass-card rounded-2xl border border-[var(--border-color)] overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <Cookie className="w-5 h-5 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{t('platformCookies.title')}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {activeCookieCount > 0
                  ? <>{t.rich('platformCookies.configured', {
                    active: () => <span className="text-green-500 font-medium">{activeCookieCount}</span>,
                    total: PLATFORMS.length,
                  })}</>
                  : t('platformCookies.none')
                }
              </p>
            </div>
          </div>
          {activeCookieCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAllCookies} disabled={isClearing !== null} className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10">
              {isClearing === 'cookies' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span className="ml-1.5 hidden sm:inline">{t('actions.clearAll')}</span>
            </Button>
          )}
        </div>

        {/* Platform List */}
        <div className="divide-y divide-[var(--border-color)]">
          {PLATFORMS.map(platform => {
            const hasCookie = userCookies[platform.id];
            const isEditing = editPlatform === platform.id;

            return (
              <div
                key={platform.id}
                className={cn(
                  'transition-colors',
                  isEditing ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-card)]'
                )}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {/* Platform Icon with colored background */}
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', platform.bgColor)}>
                      <platform.icon className={cn('w-5 h-5', platform.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{tPlatforms(platform.id)}</p>
                        {/* Status Indicator */}
                        <div className={cn(
                          'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
                          hasCookie
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                        )}>
                          <div className={cn('w-1.5 h-1.5 rounded-full', hasCookie ? 'bg-emerald-500' : 'bg-[var(--text-muted)]/40')} />
                          {hasCookie ? t('status.active') : t('status.inactive')}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{t(`platformDescriptions.${platform.id}`)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasCookie && (
                      <button
                        onClick={() => onClearCookie(platform.id)}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title={t('actions.clearCookie')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Button
                      variant={isEditing ? 'ghost' : hasCookie ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        onEditPlatform(isEditing ? null : platform.id);
                        onEditValueChange('');
                      }}
                    >
                      {isEditing ? (
                        <><X className="w-4 h-4" /><span className="ml-1">{t('actions.close')}</span></>
                      ) : hasCookie ? (
                        <><KeyRound className="w-3.5 h-3.5" /><span className="ml-1">{t('actions.edit')}</span></>
                      ) : (
                        t('actions.addCookie')
                      )}
                    </Button>
                  </div>
                </div>

                {/* Cookie Editor */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4">
                        <div className={cn('p-3 rounded-xl border', platform.borderColor, platform.bgColor)}>
                          <textarea
                            value={editValue}
                            onChange={event => onEditValueChange(event.target.value)}
                            placeholder={t('editor.placeholder')}
                            className="w-full h-24 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-mono resize-none focus:outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]/60"
                            autoFocus
                          />
                          <div className="flex items-center justify-between mt-2.5">
                            <p className="text-[10px] text-[var(--text-muted)]">
                              <ShieldCheck className="w-3 h-3 inline mr-1 text-emerald-500" />
                              {t('editor.encryptedHint')}
                            </p>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => onEditPlatform(null)}>
                                {t('actions.cancel')}
                              </Button>
                              <Button variant="primary" size="sm" onClick={() => onSaveCookie(platform.id)} disabled={!editValue.trim()}>
                                <Check className="w-4 h-4" />
                                {t('actions.save')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to Get Cookies Guide */}
      <div className="glass-card rounded-2xl border border-[var(--accent-primary)]/20 overflow-hidden">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--accent-primary)]/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--accent-primary)]">{t('guide.title')}</p>
              <p className="text-xs text-[var(--text-muted)]">{t('guide.subtitle')}</p>
            </div>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-[var(--text-muted)] transition-transform', guideOpen && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {guideOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2.5">
                {[
                  { step: '1', text: t('guide.step1') },
                  { step: '2', text: t('guide.step2') },
                  { step: '3', text: t('guide.step3') },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--bg-card)]">
                    <span className="w-6 h-6 rounded-md bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {item.step}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] pt-1">{item.text}</p>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 pl-1">
                  <ExternalLink className="w-3 h-3 text-[var(--accent-primary)]" />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {t('guide.supportsPrefix')} <span className="text-[var(--accent-primary)] font-medium">JSON</span>, <span className="text-[var(--accent-primary)] font-medium">Netscape</span>, {t('guide.and')} <span className="text-[var(--accent-primary)] font-medium">Header</span> {t('guide.supportsSuffix')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
