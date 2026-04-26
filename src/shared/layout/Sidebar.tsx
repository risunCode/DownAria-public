'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Info, Menu, X, Home, Settings, Sun, Moon, Sparkles, ChevronDown, BookOpen, Clock, Globe, User, Image, Volume2, Link2 } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    FacebookIcon,
    InstagramIcon,
    XTwitterIcon,
    TiktokIcon,
    YoutubeIcon,
    GlobeIcon,
} from '@/shared/ui/Icons';
import { ThemeType, saveTheme, initTheme, getTheme, initAccentColor, getSeasonalSettings, setBackgroundEnabled, setBackgroundSound, setSeasonalMode } from '@/shared/storage';
import { APP_EVENTS } from '@/shared/runtime';
import { useTranslations } from 'next-intl';

const THEMES: { id: ThemeType; labelKey: string; icon: typeof Sun }[] = [
    { id: 'auto', labelKey: 'themes.auto', icon: Clock },
    { id: 'dark', labelKey: 'themes.dark', icon: Moon },
    { id: 'light', labelKey: 'themes.light', icon: Sun },
    { id: 'solarized', labelKey: 'themes.solarized', icon: Sparkles },
];

// Supported platforms shown in sidebar
const PLATFORMS_CONFIG = [
    { id: 'facebook', icon: FacebookIcon, color: 'text-blue-500' },
    { id: 'instagram', icon: InstagramIcon, color: 'text-pink-500' },
    { id: 'tiktok', icon: TiktokIcon, color: 'text-cyan-400' },
    { id: 'twitter', icon: XTwitterIcon, color: 'text-[var(--text-primary)]' },
    { id: 'pixiv', icon: GlobeIcon, color: 'text-blue-400' },
    { id: 'youtube', icon: YoutubeIcon, color: 'text-red-500' },
] as const;

interface SidebarProps {
    children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarProps) {
    const tSidebar = useTranslations('sidebar');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [themeOpen, setThemeOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<ThemeType>('dark');
    const [seasonalEnabled, setSeasonalEnabled] = useState(true);
    const [quickBackgroundEnabled, setQuickBackgroundEnabled] = useState(true);
    const [quickBackgroundSound, setQuickBackgroundSound] = useState(false);
    const themeRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const pendingNavRef = useRef<(() => void) | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        initTheme(); // Apply theme to DOM
        initAccentColor(); // Apply accent color to DOM
        setCurrentTheme(getTheme()); // Get saved preference (including 'auto')

        const seasonal = getSeasonalSettings();
        setSeasonalEnabled(seasonal.mode !== 'off');
        setQuickBackgroundEnabled(seasonal.backgroundEnabled !== false);
        setQuickBackgroundSound(seasonal.backgroundSound === true);
    }, []);

    useEffect(() => {
        const syncQuickSettings = () => {
            const seasonal = getSeasonalSettings();
            setSeasonalEnabled(seasonal.mode !== 'off');
            setQuickBackgroundEnabled(seasonal.backgroundEnabled !== false);
            setQuickBackgroundSound(seasonal.backgroundSound === true);
        };

        window.addEventListener(APP_EVENTS.seasonalSettingsChanged, syncQuickSettings);
        window.addEventListener('storage', syncQuickSettings);

        return () => {
            window.removeEventListener(APP_EVENTS.seasonalSettingsChanged, syncQuickSettings);
            window.removeEventListener('storage', syncQuickSettings);
        };
    }, []);

    // Close sidebar on route change (for back/forward navigation)
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
                setThemeOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleThemeChange = (theme: ThemeType) => {
        saveTheme(theme);
        setCurrentTheme(theme);
        setThemeOpen(false);
    };

    const handleSeasonalToggle = () => {
        const next = !seasonalEnabled;
        setSeasonalEnabled(next);
        setSeasonalMode(next ? 'auto' : 'off');
    };

    const handleBackgroundToggle = () => {
        const next = !quickBackgroundEnabled;
        setQuickBackgroundEnabled(next);
        setBackgroundEnabled(next);
    };

    const handleBackgroundSoundToggle = () => {
        const next = !quickBackgroundSound;
        setQuickBackgroundSound(next);
        setBackgroundSound(next);
    };

    // Handle navigation with smooth sidebar close animation
    const handleNavigation = useCallback((href: string) => {
        // If already on this page, just close sidebar
        if (pathname === href) {
            setSidebarOpen(false);
            return;
        }

        // Store pending navigation, close sidebar, navigate after exit animation completes
        pendingNavRef.current = () => router.push(href);
        setSidebarOpen(false);
    }, [pathname, router]);

    const CurrentThemeIcon = THEMES.find(t => t.id === currentTheme)?.icon || Clock;

    // Static navLinks
    const navLinks = useMemo(() => [
        { href: '/', labelKey: 'home', icon: Home },
        { href: '/history', labelKey: 'history', icon: History },
        { href: '/docs', labelKey: 'docs', icon: BookOpen },
        { href: '/settings', labelKey: 'settings', icon: Settings },
        { href: '/about', labelKey: 'about', icon: Info },
    ], []);

    const platforms = useMemo(() => [...PLATFORMS_CONFIG], []);

    // Memoize isActive function
    const isActive = useCallback((href: string) => pathname === href, [pathname]);

    return (
        <div className="min-h-screen flex bg-[var(--bg-primary)] overflow-x-hidden max-w-full">
            {/* Mobile Header - Solid background (no blur for mobile performance) */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between px-3 py-3">
                    {/* Left: Burger + Logo */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)]"
                            aria-label={sidebarOpen ? tSidebar('closeMenu') : tSidebar('openMenu')}
                            aria-expanded={sidebarOpen}
                            aria-controls="mobile-sidebar-nav"
                        >
                            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                        <Link href="/" className="flex items-center gap-2">
                            <NextImage src="/icon.png" alt="DownAria" width={32} height={32} className="w-8 h-8 rounded-lg" />
                            <div>
                                <h1 className="text-sm font-bold gradient-text">DownAria</h1>
                                <p className="text-[9px] text-[var(--text-muted)] -mt-0.5">{tSidebar('tagline')}</p>
                            </div>
                        </Link>
                    </div>

                    {/* Right: Theme & User */}
                    <div className="flex items-center gap-1.5">
                        {/* Theme Dropdown */}
                        <div ref={themeRef} className="relative">
                            <button
                                onClick={() => setThemeOpen(!themeOpen)}
                                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors flex items-center gap-1"
                                aria-label={tSidebar('themeMenuAria')}
                                aria-expanded={themeOpen}
                            >
                                <CurrentThemeIcon className="w-5 h-5" />
                                <ChevronDown className={`w-3 h-3 transition-transform ${themeOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {themeOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 30
                                        }}
                                        className="absolute right-0 top-full mt-2 w-64 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50"
                                    >
                                        <div className="px-4 pb-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{tSidebar('theme')}</p>
                                        </div>
                                        {THEMES.map((theme) => (
                                            <button
                                                key={theme.id}
                                                onClick={() => handleThemeChange(theme.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${currentTheme === theme.id
                                                    ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                                    }`}
                                            >
                                                <theme.icon className="w-4 h-4" />
                                                    <span>{tSidebar(theme.labelKey)}</span>
                                                    {currentTheme === theme.id && (
                                                        <span className="ml-auto text-xs">✓</span>
                                                    )}
                                            </button>
                                        ))}

                                        <div className="lg:hidden mt-2 pt-2 border-t border-[var(--border-color)] px-4 pb-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{tSidebar('fastExperimental')}</p>

                                            <button
                                                onClick={handleSeasonalToggle}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 text-sm text-[var(--text-secondary)] mb-2"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4" />
                                                    {tSidebar('toggles.seasonalEffects')}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${seasonalEnabled ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                                                    {seasonalEnabled ? tSidebar('on') : tSidebar('off')}
                                                </span>
                                            </button>

                                            <button
                                                onClick={handleBackgroundToggle}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 text-sm text-[var(--text-secondary)] mb-2"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Image className="w-4 h-4" />
                                                    {tSidebar('toggles.customBackground')}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${quickBackgroundEnabled ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                                                    {quickBackgroundEnabled ? tSidebar('on') : tSidebar('off')}
                                                </span>
                                            </button>

                                            <button
                                                onClick={handleBackgroundSoundToggle}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 text-sm text-[var(--text-secondary)]"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Volume2 className="w-4 h-4" />
                                                    {tSidebar('toggles.backgroundSound')}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${quickBackgroundSound ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                                                    {quickBackgroundSound ? tSidebar('on') : tSidebar('off')}
                                                </span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Profile Dropdown */}
                        <div ref={profileRef} className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors flex items-center gap-1"
                                aria-label={tSidebar('profileMenuAria')}
                            >
                                <User className="w-5 h-5" />
                            </button>
                            <AnimatePresence>
                                {profileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 30
                                        }}
                                        className="absolute right-0 top-full mt-2 w-44 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-[9999]"
                                    >
                                        {/* User Header */}
                                        <div className="px-4 py-2 border-b border-[var(--border-color)]">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{tSidebar('guest')}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{tSidebar('notLoggedIn')}</p>
                                        </div>

                                        {/* Menu Items */}
                                        <Link
                                            href="/settings"
                                            onClick={() => setProfileOpen(false)}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                        >
                                            <Settings className="w-4 h-4" />
                                            <span>{tSidebar('settings')}</span>
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden fixed inset-0 z-40 bg-black/60"
                        />
                        {/* Menu */}
                        <motion.aside
                            id="mobile-sidebar-nav"
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 30,
                                mass: 0.8
                            }}
                            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] will-change-transform"
                            onAnimationComplete={(definition) => {
                                if (definition && typeof definition === 'object' && 'x' in definition && definition.x === -280) {
                                    pendingNavRef.current?.();
                                    pendingNavRef.current = null;
                                }
                            }}
                        >
                            <div className="overflow-y-auto h-full">
                                <SidebarContent
                                    navLinks={navLinks}
                                    platforms={platforms}
                                    isActive={isActive}
                                    onNavigate={handleNavigation}
                                />
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:w-[280px] lg:fixed lg:inset-y-0 lg:left-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] overflow-y-auto">
                <SidebarContent
                    navLinks={navLinks}
                    platforms={platforms}
                    isActive={isActive}
                />
            </aside>

             {/* Main Content */}
                 <main id="main-content" className="flex-1 lg:ml-[280px] overflow-x-hidden max-w-full min-w-0">
                {/* Mobile spacer */}
                <div className="lg:hidden h-[60px]" />
         <div className="min-h-screen overflow-x-hidden max-w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

interface SidebarContentProps {
    navLinks: { href: string; labelKey: string; icon: React.FC<{ className?: string }> }[];
    platforms: { id: string; icon: React.FC<{ className?: string }>; color: string }[];
    isActive: (href: string) => boolean;
    onNavigate?: (href: string) => void;
}

function SidebarContent({ navLinks, platforms, isActive, onNavigate }: SidebarContentProps) {
    const t = useTranslations('nav');
    const tSidebar = useTranslations('sidebar');
    const tPlatforms = useTranslations('platforms');
    const [accountOpen, setAccountOpen] = useState(false);

    // Handle link click - use custom navigation if provided (mobile), otherwise default Link behavior (desktop)
    const handleLinkClick = (e: React.MouseEvent, href: string) => {
        if (onNavigate) {
            e.preventDefault();
            onNavigate(href);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-5 border-b border-[var(--border-color)]">
                <Link
                    href="/"
                    onClick={(e) => handleLinkClick(e, '/')}
                    className="flex items-center gap-3 group"
                >
                    <NextImage
                        src="/icon.png"
                        alt="DownAria"
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-xl shadow-lg shadow-[var(--accent-primary)]/20"
                    />
                    <div>
                        <h1 className="text-lg font-bold gradient-text">DownAria</h1>
                        <p className="text-xs text-[var(--text-muted)] -mt-0.5">{tSidebar('tagline')}</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1" aria-label={t('navigation')}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 mb-3">
                    {t('navigation')}
                </p>
                {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={(e) => handleLinkClick(e, link.href)}
                            aria-current={isActive(link.href) ? 'page' : undefined}
                            className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${isActive(link.href)
                                ? 'text-[var(--accent-primary)] font-bold'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                                }`}
                        >
                            <link.icon className={`w-5 h-5 transition-transform duration-300 ${isActive(link.href) ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-medium">{t(link.labelKey)}</span>
                            {isActive(link.href) && (
                                <motion.div 
                                    layoutId="sidebar-active-pill"
                                    className="absolute left-0 w-1 h-5 bg-[var(--accent-primary)] rounded-full"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                        </Link>
                ))}

                {/* Platforms Section */}
                <div className="pt-6">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 mb-3">
                        {t('supportedPlatforms')}
                    </p>
                    <div className="space-y-1">
                        {platforms.map((platform, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[var(--text-secondary)]"
                            >
                                <platform.icon className={`w-4 h-4 ${platform.color}`} />
                                <span className="text-sm leading-none">{tPlatforms(platform.id)}</span>
                            </div>
                        ))}

                        <a
                            href="https://github.com/yt-dlp/yt-dlp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 flex items-start gap-2.5 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] transition-colors"
                        >
                            <Link2 className="w-4 h-4 mt-0.5 text-[var(--accent-primary)] shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[11px] leading-tight font-medium">{tSidebar('ytDlp.title')}</p>
                                <p className="text-[10px] text-[var(--text-muted)] truncate">github.com/yt-dlp/yt-dlp</p>
                            </div>
                        </a>
                    </div>
                </div>
            </nav>

            {/* Account Section */}
            <div className="hidden lg:block p-4 border-t border-[var(--border-color)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 mb-3">
                    {tSidebar('account')}
                </p>
                <div className="relative">
                    <button
                        onClick={() => setAccountOpen(!accountOpen)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card)] transition-colors text-[var(--text-secondary)]"
                    >
                        <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-[var(--text-primary)] leading-none">{tSidebar('guest')}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {accountOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 30
                                }}
                                className="absolute bottom-full left-0 right-0 mb-2 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50"
                            >
                                <Link
                                    href="/settings"
                                    onClick={(e) => { handleLinkClick(e, '/settings'); setAccountOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>{tSidebar('settings')}</span>
                                </Link>
                                <Link
                                    href="/about"
                                    onClick={(e) => { handleLinkClick(e, '/about'); setAccountOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                    <Info className="w-4 h-4" />
                                    <span>{tSidebar('aboutDownAria')}</span>
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-color)]">
                <div className="px-4">
                    <p className="text-xs text-[var(--text-muted)]">
                        <span>&copy; {new Date().getFullYear()} </span>
                        <span className="hover:text-[var(--accent-primary)] transition-colors">risunCode</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
