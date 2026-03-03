'use client';

/**
 * Changelog Page
 *
 * Parses CHANGELOG.md (passed as prop from server component) and renders
 * as collapsible cards per version — adapted from Downaria2.
 *
 * Supports flexible markdown format:
 * - ## [version] - date        → new card
 * - ### 🚀 Headline            → highlight badge
 * - #### 📦 New Features        → categorized section
 * - ## Any Text (no brackets)  → sub-section within current card
 * - ### Unrecognized Header     → falls back to "Notes"
 * - List items without section  → auto-assigned to "Notes"
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Sparkles,
    Wrench,
    Bug,
    Trash2,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Shield,
} from 'lucide-react';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { DocsNavbar } from '@/components/docs/DocsNavbar';

type ChangeType = 'new' | 'improved' | 'fixed' | 'removed' | 'notes' | 'security';

interface Change {
    type: ChangeType;
    items: string[];
}

interface ChangelogEntry {
    version: string;
    date: string;
    highlight?: string;
    changes: Change[];
}

function sanitizeHydrationText(value: string): string {
    const normalized = value.normalize('NFC').replace(/\uFFFD/g, '');
    let safe = '';

    for (let i = 0; i < normalized.length; i++) {
        const code = normalized.charCodeAt(i);

        // High surrogate
        if (code >= 0xd800 && code <= 0xdbff) {
            const next = normalized.charCodeAt(i + 1);
            // Keep only valid surrogate pair
            if (next >= 0xdc00 && next <= 0xdfff) {
                safe += normalized[i] + normalized[i + 1];
                i++;
            }
            continue;
        }

        // Lone low surrogate -> skip
        if (code >= 0xdc00 && code <= 0xdfff) {
            continue;
        }

        safe += normalized[i];
    }

    return safe.trim();
}

const typeConfig: Record<ChangeType, { icon: typeof Sparkles; label: string; color: string }> = {
    new: { icon: Sparkles, label: 'New', color: 'bg-green-500/20 text-green-400' },
    improved: { icon: Wrench, label: 'Improved', color: 'bg-blue-500/20 text-blue-400' },
    fixed: { icon: Bug, label: 'Fixed', color: 'bg-yellow-500/20 text-yellow-400' },
    removed: { icon: Trash2, label: 'Removed', color: 'bg-red-500/20 text-red-400' },
    security: { icon: Shield, label: 'Security', color: 'bg-purple-500/20 text-purple-400' },
    notes: { icon: BookOpen, label: 'Notes', color: 'bg-gray-500/20 text-gray-400' },
};

// Map markdown headers to change types
const headerToType: Record<string, ChangeType> = {
    'new features': 'new',
    'features': 'new',
    'added': 'new',
    'new': 'new',
    'improvements': 'improved',
    'improved': 'improved',
    'changes': 'improved',
    'changed': 'improved',
    'bug fixes': 'fixed',
    'fixes': 'fixed',
    'fixed': 'fixed',
    'removed': 'removed',
    'deprecated': 'removed',
    'security': 'security',
};

/**
 * Parse CHANGELOG.md content into structured data.
 * Flexible: unrecognized sections and orphan items fall back to "notes".
 */
function parseChangelog(markdown: string): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const normalizedMarkdown = sanitizeHydrationText(markdown).replace(/\r\n?/g, '\n');
    const lines = normalizedMarkdown.split('\n');

    let currentEntry: ChangelogEntry | null = null;
    let currentType: ChangeType | null = null;
    let currentItems: string[] = [];

    const saveCurrentChange = () => {
        if (currentEntry && currentType && currentItems.length > 0) {
            currentEntry.changes.push({ type: currentType, items: [...currentItems] });
            currentItems = [];
        }
    };

    const saveCurrentEntry = () => {
        saveCurrentChange();
        if (currentEntry && (currentEntry.changes.length > 0 || currentEntry.highlight)) {
            entries.push(currentEntry);
        }
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '---') continue;

        // 1) Version header with date: ## [2.1.0] - 2026-03-01
        const versionMatch = trimmed.match(/^##\s*\[([^\]]+)\]\s*-\s*(.+)$/);
        if (versionMatch) {
            saveCurrentEntry();
            currentEntry = {
                version: sanitizeHydrationText(versionMatch[1]),
                date: sanitizeHydrationText(versionMatch[2]),
                changes: [],
            };
            currentType = null;
            continue;
        }

        // 2) Version header without date: ## [December 2025] or ## [0x1]
        const altVersionMatch = trimmed.match(/^##\s*\[([^\]]+)\](.*)$/);
        if (altVersionMatch) {
            saveCurrentEntry();
            const dateOrTitle = sanitizeHydrationText(altVersionMatch[2].replace(/^\s*-\s*/, '').trim());
            currentEntry = {
                version: sanitizeHydrationText(altVersionMatch[1]),
                date: dateOrTitle || sanitizeHydrationText(altVersionMatch[1]),
                changes: [],
            };
            currentType = null;
            continue;
        }

        // Skip if no current entry yet
        if (!currentEntry) continue;

        // 3) ## without brackets (e.g. "## Version History") → sub-section inside current card
        const subHeadingMatch = trimmed.match(/^##\s+(.+)$/);
        if (subHeadingMatch) {
            saveCurrentChange();
            const name = subHeadingMatch[1].toLowerCase().replace(/[^a-z\s]/g, '').trim();
            currentType = headerToType[name] || 'notes';
            continue;
        }

        // 4) Highlight line: ### 🚀 Text (### with emoji)
        const highlightMatch = trimmed.match(/^###\s*[🚀🎨🔐🤖✨🔧🐛🗑️📦🔌🎯📚🔄🆕🔒🍪📊🎵🧪🔀]+\s*(.+)$/);
        if (highlightMatch) {
            currentEntry.highlight = sanitizeHydrationText(highlightMatch[1]);
            continue;
        }

        // 5) Section header: ### or #### (with optional emojis)
        const sectionMatch = trimmed.match(/^#{3,4}\s*[📦🔧🐛🗑️✨🆕🔄📁🧪🔀🔒📊🎵🛡️]*\s*(.+)$/);
        if (sectionMatch) {
            saveCurrentChange();
            const sectionName = sectionMatch[1].toLowerCase().replace(/[^a-z\s]/g, '').trim();
            const mapped = headerToType[sectionName];
            if (mapped) {
                currentType = mapped;
            } else {
                // Unrecognized header → notes, and include the header text as first item
                currentType = 'notes';
                currentItems.push(sanitizeHydrationText(sectionMatch[1]));
            }
            continue;
        }

        // 6) List item
        const listMatch = trimmed.match(/^-\s+(.+)$/);
        if (listMatch) {
            // If no section type set yet, default to notes
            if (!currentType) currentType = 'notes';
            let item = listMatch[1];
            item = item.replace(/\*\*([^*]+)\*\*/g, '$1');
            item = item.replace(/`([^`]+)`/g, '$1');
            item = item.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            currentItems.push(sanitizeHydrationText(item));
        }
    }

    // Save last entry
    saveCurrentEntry();

    return entries;
}

interface ChangelogPageProps {
    markdownContent: string;
}

export function ChangelogPage({ markdownContent }: ChangelogPageProps) {
    const changelog = useMemo(() => parseChangelog(markdownContent), [markdownContent]);
    const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
        () => new Set(changelog.length > 0 ? [changelog[0].version] : [])
    );

    const toggleVersion = (version: string) => {
        setExpandedVersions(prev => {
            const next = new Set(prev);
            if (next.has(version)) next.delete(version);
            else next.add(version);
            return next;
        });
    };

    return (
        <SidebarLayout>
            <div className="docs-surface py-6 px-4 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <DocsNavbar />
                    <div className="space-y-6">
                        {/* Header */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-3xl font-bold mb-2"><span className="gradient-text">Changelog</span></h1>
                            <p className="text-[var(--text-muted)] text-sm">Version history and release notes.</p>
                        </motion.div>

                        {/* Changelog cards */}
                        {changelog.length === 0 ? (
                            <div className="text-center py-20 text-[var(--text-muted)]">No changelog entries found.</div>
                        ) : (
                            <div className="space-y-4">
                                {changelog.map((entry, idx) => {
                                    const isExpanded = expandedVersions.has(entry.version);
                                    return (
                                        <motion.div
                                            key={entry.version}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                            className="glass-card settings-surface-card border border-[var(--border-color)] rounded-2xl overflow-hidden"
                                        >
                                            <button
                                                onClick={() => toggleVersion(entry.version)}
                                                className="changelog-toggle settings-surface-card-hover w-full p-4 sm:p-5 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors text-left"
                                            >
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                    <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">v{entry.version}</h2>
                                                    {idx === 0 && (
                                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-500/20 text-green-400 animate-pulse">
                                                            Latest
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-[var(--text-muted)]">{entry.date}</span>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
                                            </button>

                                            {isExpanded && (
                                                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
                                                    {entry.highlight && (
                                                        <div className="px-3 py-2 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30">
                                                            <span className="text-sm font-medium text-[var(--accent-primary)]">{entry.highlight}</span>
                                                        </div>
                                                    )}
                                                    {entry.changes.map((change, i) => {
                                                        const config = typeConfig[change.type];
                                                        return (
                                                            <div key={i}>
                                                                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium mb-2 ${config.color}`}>
                                                                    <config.icon className="w-3 h-3" />
                                                                    {config.label}
                                                                </div>
                                                                <ul className="space-y-1 ml-4">
                                                                    {change.items.map((item, j) => (
                                                                        <li key={j} className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
                                                                            <span className="text-[var(--border-color)] mt-1">•</span>
                                                                            <span>{item}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer link */}
                        <div className="text-center text-sm text-[var(--text-muted)] py-4">
                            Full changelog in{' '}
                            <a href="https://github.com/risunCode/DownAria/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">
                                CHANGELOG.md
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </SidebarLayout>
    );
}
