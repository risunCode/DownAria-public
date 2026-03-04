'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clipboard, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LightbulbIcon, PlatformIcon } from '@/components/ui/Icons';
import { PlatformId, PLATFORMS } from '@/lib/types';
import { validatePublicHttpUrl, platformDetect, sanitizeUrl } from '@/lib/utils/format';

interface DownloadFormProps {
    platform: PlatformId;
    onPlatformChange: (platform: PlatformId) => void;
    onSubmit: (url: string) => void;
    isLoading: boolean;
    initialUrl?: string;
    enableAutoSubmit?: boolean;
}

// Progress steps for loading animation - keys for translation
const PROGRESS_STEP_KEYS = [
    { progress: 15, key: 'connecting' },
    { progress: 35, key: 'fetching' },
    { progress: 55, key: 'extracting' },
    { progress: 75, key: 'validating' },
    { progress: 90, key: 'almostDone' },
];

// Rotating tips/hints - keys for translation
const TIP_KEYS = ['tip1', 'tip2', 'tip3', 'tip4', 'tip5', 'tip6'];

export function DownloadForm({
    platform,
    onPlatformChange,
    onSubmit,
    isLoading,
    initialUrl,
    enableAutoSubmit = true,
}: DownloadFormProps) {
    const [url, setUrl] = useState(initialUrl || '');
    const [error, setError] = useState('');
    const [justPasted, setJustPasted] = useState(false);
    const [tipIndex, setTipIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [elapsedMs, setElapsedMs] = useState(0);
    const lastAutoSubmittedUrlRef = useRef<string | null>(null);
    const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isLoadingRef = useRef(isLoading);
    const onSubmitRef = useRef(onSubmit);
    const onPlatformChangeRef = useRef(onPlatformChange);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);
    const elapsedInterval = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const t = useTranslations('download');
    const tErrors = useTranslations('errors');

    const currentPlatform = PLATFORMS.find(p => p.id === platform);

    // Sync with initialUrl prop (for share page)
    useEffect(() => {
        if (initialUrl && initialUrl !== url) {
            setUrl(initialUrl);
        }
    }, [initialUrl]);

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    useEffect(() => {
        onPlatformChangeRef.current = onPlatformChange;
    }, [onPlatformChange]);

    // Progress bar animation when loading
    useEffect(() => {
        if (isLoading) {
            setProgress(0);
            setElapsedMs(0);
            startTimeRef.current = Date.now();
            setProgressText(t('progress.starting'));
            let stepIndex = 0;
            
            // Progress steps
            progressInterval.current = setInterval(() => {
                if (stepIndex < PROGRESS_STEP_KEYS.length) {
                    setProgress(PROGRESS_STEP_KEYS[stepIndex].progress);
                    setProgressText(t(`progress.${PROGRESS_STEP_KEYS[stepIndex].key}`));
                    stepIndex++;
                }
            }, 800);
            
            // Real-time elapsed counter (every 100ms for smooth updates)
            elapsedInterval.current = setInterval(() => {
                setElapsedMs(Date.now() - startTimeRef.current);
            }, 100);
        } else {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
            }
            if (elapsedInterval.current) {
                clearInterval(elapsedInterval.current);
                elapsedInterval.current = null;
            }
            // Quick finish animation
            if (progress > 0) {
                setProgress(100);
                setProgressText(t('progress.done'));
                setTimeout(() => {
                    setProgress(0);
                    setProgressText('');
                    setElapsedMs(0);
                }, 500);
            }
        }
        
        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
            if (elapsedInterval.current) {
                clearInterval(elapsedInterval.current);
            }
        };
    }, [isLoading, t]);

    // Rotate tips every 5 seconds (only when no URL entered)
    useEffect(() => {
        if (url) return; // Stop rotation when URL is entered
        const interval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % TIP_KEYS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [url]);

    const clearAutoSubmitTimer = () => {
        if (autoSubmitTimeoutRef.current) {
            clearTimeout(autoSubmitTimeoutRef.current);
            autoSubmitTimeoutRef.current = null;
        }
    };

    const autoSubmitIfValid = (rawUrl: string) => {
        if (!enableAutoSubmit || isLoadingRef.current) return;

        const cleanUrl = sanitizeUrl(rawUrl);
        if (!cleanUrl || cleanUrl === lastAutoSubmittedUrlRef.current) return;

        const detected = platformDetect(cleanUrl);

        if (!validatePublicHttpUrl(cleanUrl)) return;

        if (detected && detected !== platform) {
            onPlatformChangeRef.current(detected);
        }

        lastAutoSubmittedUrlRef.current = cleanUrl;
        onSubmitRef.current(cleanUrl);
    };

    const scheduleAutoSubmit = (rawUrl: string, delay = 100) => {
        if (!enableAutoSubmit) return;
        clearAutoSubmitTimer();
        autoSubmitTimeoutRef.current = setTimeout(() => {
            autoSubmitIfValid(rawUrl);
        }, delay);
    };

    useEffect(() => {
        return () => {
            clearAutoSubmitTimer();
        };
    }, []);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!url.trim()) { setError(tErrors('enterUrl')); return; }
        
        const detected = platformDetect(url);
        if (detected && detected !== platform) onPlatformChange(detected);
        
        const cleanUrl = sanitizeUrl(url) || url.trim();
        if (!validatePublicHttpUrl(cleanUrl)) {
            setError(tErrors('invalidUrl'));
            return;
        }
        onSubmit(cleanUrl);
    };

    const handleUrlChange = (value: string) => {
        setUrl(value);
        setError('');
        if (value.length > 10) {
            const detected = platformDetect(value);
            if (detected && detected !== platform) onPlatformChange(detected);
        }
    };

    // Process pasted text - always update even if same URL (force refresh)
    const processPastedText = (text: string) => {
        if (!text) return false;
        const cleanUrl = sanitizeUrl(text);
        if (cleanUrl) {
            setUrl(cleanUrl);
            setJustPasted(true);
            setTimeout(() => setJustPasted(false), 1500);
            setError('');
            const detected = platformDetect(cleanUrl);
            if (detected && detected !== platform) onPlatformChange(detected);
            scheduleAutoSubmit(cleanUrl);
            return true;
        }
        return false;
    };

    const handlePaste = async () => {
        setError('');
        
        // Method 1: Try modern Clipboard API first (works on HTTPS with user gesture)
        if (navigator.clipboard && navigator.clipboard.readText) {
            try {
                const text = await navigator.clipboard.readText();
                const cleanUrl = sanitizeUrl(text);
                if (cleanUrl) {
                    // Always update URL from clipboard, even if same (force refresh)
                    setUrl(cleanUrl);
                    setJustPasted(true);
                    setTimeout(() => setJustPasted(false), 1500);
                    setError('');
                    const detected = platformDetect(cleanUrl);
                    if (detected && detected !== platform) onPlatformChange(detected);
                    scheduleAutoSubmit(cleanUrl);
                    return;
                }
                if (text && !cleanUrl) {
                    setError(tErrors('noValidUrl'));
                    return;
                }
            } catch {
                // Clipboard API failed, try fallback
            }
        }
        
        // Method 2: Focus input and let user paste manually
        // This is the most reliable cross-browser/device method
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
            
            // Try execCommand as fallback (deprecated but still works)
            try {
                const success = document.execCommand('paste');
                if (success) return;
            } catch {
                // execCommand not supported
            }
            
            // Show helpful message
            setError(tErrors('pasteHint'));
        }
    };

    // Global paste listener
    useEffect(() => {
        const handler = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            const text = e.clipboardData?.getData('text');
            if (text) {
                const cleanUrl = sanitizeUrl(text);
                if (cleanUrl) {
                    const detected = platformDetect(cleanUrl);
                    setUrl(cleanUrl);
                    setError('');
                    if (detected && detected !== platform) onPlatformChange(detected);
                    scheduleAutoSubmit(cleanUrl);
                }
            }
        };
        window.addEventListener('paste', handler);
        return () => window.removeEventListener('paste', handler);
    }, [enableAutoSubmit, platform, scheduleAutoSubmit]);

    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="w-full"
        >
            {/* Animated border wrapper - always spinning */}
            <div className="relative rounded-lg p-[2px]">
                {/* Spinning gradient border - always visible */}
                <div 
                    className="absolute inset-0 rounded-lg bg-[conic-gradient(from_var(--border-angle),var(--accent-primary)_0%,transparent_10%,transparent_90%,var(--accent-primary)_100%)] animate-spin-slow opacity-45"
                />
                {/* Card content - no hover effects */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 sm:p-6 space-y-4 relative rounded-lg">
                {/* Rotating tip or platform indicator */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs sm:text-sm min-h-6 text-center">
                    {url ? (
                        <div className="flex flex-wrap items-center justify-center gap-2 min-w-0">
                            {isLoading ? (
                                <span className="text-[var(--text-muted)]">{t('processingLink')}</span>
                            ) : (
                                <>
                                    <span className="text-[var(--text-muted)]">{t('downloadingFrom')}</span>
                                    <span 
                                        className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border max-w-full"
                                        style={{ 
                                            background: currentPlatform?.id === 'twitter' ? 'var(--bg-secondary)' : `${currentPlatform?.color}20`,
                                            color: currentPlatform?.id === 'twitter' ? 'var(--text-primary)' : currentPlatform?.color,
                                            borderColor: currentPlatform?.id === 'twitter' ? 'var(--border-color)' : `${currentPlatform?.color}55`,
                                        }}
                                    >
                                        <PlatformIcon platform={currentPlatform?.id || ''} className="w-4 h-4 shrink-0" />
                                        <span className="break-words [overflow-wrap:anywhere]">{currentPlatform?.name}</span>
                                    </span>
                                </>
                            )}
                        </div>
                    ) : (
                        <span className="text-[var(--text-muted)] text-xs flex flex-wrap items-center justify-center gap-1 break-words [overflow-wrap:anywhere]">
                            <LightbulbIcon className="w-3 h-3 text-yellow-500" /> {t(`tips.${TIP_KEYS[tipIndex]}`)}
                        </span>
                    )}
                </div>

                {/* Input row */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                        <Input
                            ref={inputRef}
                            type="url"
                            placeholder={t('pasteUrl')}
                            value={url}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            onPaste={(e) => {
                                const text = e.clipboardData?.getData('text');
                                if (text && processPastedText(text)) {
                                    e.preventDefault(); // Prevent default if we handled it
                                }
                            }}
                            maxLength={2000}
                            error={error}
                            disabled={isLoading}
                            className="w-full py-2.5 pl-10 pr-3 text-sm sm:py-4 sm:pl-12 sm:pr-12 sm:text-base"
                        />
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handlePaste}
                            disabled={isLoading}
                            className="flex-1 sm:flex-none min-w-0 px-2 sm:px-3"
                        >
                            {justPasted ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}
                            <span className="ml-1 text-xs sm:text-sm truncate">{justPasted ? t('pasted') : t('paste')}</span>
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            className="flex-1 sm:flex-none min-w-0 px-2 sm:px-3"
                        >
                            <ArrowRight className="w-4 h-4" />
                            <span className="ml-1 text-xs sm:text-sm truncate">{t('go')}</span>
                        </Button>
                    </div>
                </div>

                {/* Progress bar */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        <div className="flex justify-between text-xs text-[var(--text-muted)]">
                            <span>{progressText}</span>
                            <span className="font-mono tabular-nums">
                                {elapsedMs < 10000 
                                    ? `${(elapsedMs / 1000).toFixed(1)}s` 
                                    : `${Math.floor(elapsedMs / 1000)}s`
                                }
                            </span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{
                                    background: `linear-gradient(90deg, ${currentPlatform?.color || 'var(--accent-primary)'}, var(--accent-secondary))`,
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                        </div>
                    </motion.div>
                )}



                </div>
            </div>
        </motion.form>
    );
}
