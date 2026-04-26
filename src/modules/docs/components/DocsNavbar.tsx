'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, Rocket, Code2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

const navItems = [
    { href: '/docs', labelKey: 'overview', icon: Rocket },
    { href: '/docs/api', labelKey: 'apiUsage', icon: Code2 },
    { href: '/docs/errors', labelKey: 'errors', icon: AlertCircle },
    { href: '/docs/faq', labelKey: 'faq', icon: HelpCircle },
];

export function DocsNavbar() {
    const t = useTranslations('docs.nav');
    const pathname = usePathname();
    const current = navItems.find((item) => item.href === pathname);
    const currentLabel = current ? t(current.labelKey) : t('overview');

    return (
        <div className="mb-6 overflow-hidden max-w-full">
            <div className="inline-flex items-center gap-1.5 text-xs mb-4 px-2.5 py-1.5 rounded-lg settings-surface-card border border-[var(--border-color)]">
                      <Link href="/docs" className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors font-medium">
               {t('overview')}
               </Link>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="text-[var(--text-primary)] font-semibold">{currentLabel}</span>
            </div>

                     <div className="-mx-1 px-1 overflow-x-auto scrollbar-hide max-w-full">
                <div className="flex gap-2 min-w-max">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${isActive
                                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                }`}
                        >
                            <item.icon className="w-3.5 h-3.5" />
     {t(item.labelKey)}
   <span
                                className={`absolute inset-0 rounded-lg border transition-opacity duration-200 ${isActive
                                    ? 'opacity-100 border-[var(--accent-primary)]/30'
                                    : 'opacity-0 border-transparent'
                                    }`}
                            />
                        </Link>
                    );
                })}
                </div>
            </div>
        </div>
    );
}
