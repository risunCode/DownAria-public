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
            <div className="flex flex-wrap items-center gap-1.5 text-xs mb-4 px-3 py-2 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)]">
                <Link href="/docs" className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors font-medium">
                    {t('overview')}
                </Link>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="text-[var(--text-primary)] font-semibold truncate">{currentLabel}</span>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`relative flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-medium transition-all ${isActive
                                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                }`}
                        >
                            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">{t(item.labelKey)}</span>
                            <span
                                className={`absolute inset-0 rounded-xl border transition-opacity duration-200 ${isActive
                                    ? 'opacity-100 border-[var(--accent-primary)]/30'
                                    : 'opacity-0 border-transparent'
                                    }`}
                            />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
