'use client';

import { useState, useEffect, FormEvent, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clipboard, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { LightbulbIcon, PlatformIcon } from '@/shared/ui/Icons';
import { type DownloaderSubmission } from '@/modules/downloader';
import { getDownloaderInputErrorReasonMessageKey, resolveDownloaderSubmission } from '@/modules/downloader/services';
import { PlatformId, PLATFORMS } from '@/modules/media';
import { platformDetect } from '@/shared/utils/format';

interface DownloadFormProps {
    platform: PlatformId;
    onPlatformChange: (platform: PlatformId) => void;
    onSubmit: (submission: DownloaderSubmission) => void;
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
    const [helperMessage, setHelperMessage] = useState('');
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

    const applySubmission = (submission: DownloaderSubmission) => {
        if (submission.platform !== platform) {
            onPlatformChangeRef.current(submission.platform);
        }

        lastAutoSubmittedUrlRef.current = submission.url;
        onSubmitRef.current({ url: submission.url, platform: submission.platform });
    };

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

        const parsed = resolveDownloaderSubmission(rawUrl, platform);
        if (!parsed.ok || parsed.url === lastAutoSubmittedUrlRef.current) return;

        applySubmission(parsed);
    };

    const showPasteSuccess = () => {
        setJustPasted(true);
        setTimeout(() => setJustPasted(false), 1500);
    };

    const applyParsedInput = useCallback((text: string, source: 'input' | 'paste'): boolean => {
        if (!text) return false;

        const submission = resolveDownloaderSubmission(text, platform);

        if (submission.ok) {
            setUrl(submission.url);
            setError('');
            setHelperMessage('');
            if (source === 'paste') {
                showPasteSuccess();
            }
            if (submission.platform !== platform) {
                onPlatformChangeRef.current(submission.platform);
            }
            if (source === 'paste') {
                scheduleAutoSubmit(submission.url);
            }
            return true;
        }

        if (source === 'paste') {
            setHelperMessage('');
            if (submission.reason !== 'empty') {
                setError(tErrors(getDownloaderInputErrorReasonMessageKey(submission.reason)));
            }
        }

        return false;
    }, [platform, tErrors]);

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

        const parsed = resolveDownloaderSubmission(url, platform);
        if (!parsed.ok) {
            setHelperMessage('');
            setError(tErrors(getDownloaderInputErrorReasonMessageKey(parsed.reason)));
            return;
        }

        setError('');
        setHelperMessage('');
        applySubmission(parsed);
    };

    const handleUrlChange = (value: string) => {
        setUrl(value);
        setError('');
        setHelperMessage('');
        if (value.length > 5) {
            const submission = resolveDownloaderSubmission(value, platform);
            const detected = submission.ok ? submission.platform : null;
            if (detected && detected !== platform) onPlatformChange(detected);
        }
    };

    const processPastedText = (text: string) => {
        return applyParsedInput(text, 'paste');
    };

    const handlePaste = async () => {
        setError('');
        setHelperMessage('');
        
        if (navigator.clipboard && navigator.clipboard.readText) {
            try {
                const text = await navigator.clipboard.readText();
                if (processPastedText(text)) {
                    return;
                }
            } catch {
                // Clipboard API unavailable, fall through to manual paste hint.
            }
        }

        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
            setHelperMessage(tErrors('pasteHint'));
        }
    };

    // Restricted global paste listener
    useEffect(() => {
        const handler = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
            if (isEditable || url.trim()) return;
            const text = e.clipboardData?.getData('text');
            if (text && processPastedText(text)) {
                e.preventDefault();
            }
        };
        window.addEventListener('paste', handler);
        return () => window.removeEventListener('paste', handler);
    }, [url, platform, applyParsedInput]);

    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="w-full"
        >
            {/* Accent ring - focus/loading only */}
            <div className="accent-ring" data-always="true" data-loading={isLoading ? 'true' : 'false'}>
                {/* Card content */}
                <div className="surface-card p-4 sm:p-6 space-y-4 relative rounded-lg">
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
                                        className="status-chip status-neutral max-w-full"
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
                        <div className="relative">
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
                                helperText={helperMessage}
                                disabled={isLoading}
                                glowAnimation={false}
                                highlightOnFocus={false}
                                className="w-full py-2.5 pl-10 pr-3 text-sm sm:py-4 sm:pl-12 sm:pr-12 sm:text-base focus:shadow-none"
                            />
                            {url && !isLoading && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUrl('');
                                        setError('');
                                        setHelperMessage('');
                                        inputRef.current?.focus();
                                    }}
                                    className="absolute right-2 top-[18px] sm:top-4 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
                                    aria-label={t('clearInput')}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
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
                            isLoading={isLoading}
                            className="flex-1 sm:flex-none min-w-0 px-2 sm:px-3"
                        >
                            {!isLoading && <ArrowRight className="w-4 h-4" />}
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
                        <div className="h-1.5 surface-muted rounded-full overflow-hidden">
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
