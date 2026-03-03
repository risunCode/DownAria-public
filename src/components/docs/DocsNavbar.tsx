'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, HelpCircle, Rocket, Code2 } from 'lucide-react';

const navItems = [
    { href: '/docs', label: 'Overview', icon: Rocket },
    { href: '/docs/api', label: 'API', icon: Code2 },
    { href: '/docs/faq', label: 'FAQ', icon: HelpCircle },
    { href: '/docs/changelog', label: 'Changelog', icon: FileText },
];

export function DocsNavbar() {
    const pathname = usePathname();
    const current = navItems.find((item) => item.href === pathname);
    const currentLabel = current?.label || 'Overview';

    return (
        <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs mb-4 px-2.5 py-1.5 rounded-lg settings-surface-card border border-[var(--border-color)]">
                <Link href="/docs" className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors font-medium">
                    Docs
                </Link>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="text-[var(--text-primary)] font-semibold">{currentLabel}</span>
            </div>

            <div className="-mx-1 px-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 min-w-max">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${isActive
                                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                }`}
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            {item.label}
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
