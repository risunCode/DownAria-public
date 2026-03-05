'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { PlatformId } from '@/lib/types';
import { getProxiedThumbnail } from '@/lib/api/proxy';

// ═══════════════════════════════════════════════════════════════
// GLOBAL THUMBNAIL QUEUE - Max 10 concurrent, retry on fail
// ═══════════════════════════════════════════════════════════════

const thumbnailQueue: Array<() => void> = [];
let activeLoads = 0;
const MAX_CONCURRENT = 10;

function processQueue() {
    while (activeLoads < MAX_CONCURRENT && thumbnailQueue.length > 0) {
        const next = thumbnailQueue.shift();
        if (next) {
            activeLoads++;
            next();
        }
    }
}

function queueThumbnailLoad(loadFn: () => Promise<void>): void {
    thumbnailQueue.push(() => {
        loadFn().finally(() => {
            activeLoads--;
            processQueue();
        });
    });
    processQueue();
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export interface LazyThumbnailProps {
    src: string;
    alt: string;
    platform: PlatformId;
    className?: string;
    eager?: boolean;
}

export function LazyThumbnail({ src, alt, platform, className = '', eager = false }: LazyThumbnailProps) {
    const [isVisible, setIsVisible] = useState(eager);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [shouldLoad, setShouldLoad] = useState(eager);
    const ref = useRef<HTMLDivElement>(null);
    const MAX_RETRIES = 3;

    // IntersectionObserver for lazy loading
    useEffect(() => {
        if (eager) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [eager]);

    // Queue the load when visible
    useEffect(() => {
        if (!isVisible || shouldLoad) return;

        queueThumbnailLoad(async () => {
            setShouldLoad(true);
        });
    }, [isVisible, shouldLoad]);

    const handleLoad = () => {
        setIsLoaded(true);
        setHasError(false);
    };

    const handleError = () => {
        if (retryCount < MAX_RETRIES) {
            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setHasError(false);
            }, 1000 * (retryCount + 1));
        } else {
            setHasError(true);
        }
    };

    const proxiedSrc = getProxiedThumbnail(src, platform);
    const srcWithRetry = retryCount > 0 ? `${proxiedSrc}&_retry=${retryCount}` : proxiedSrc;

    return (
        <div ref={ref} className="relative w-full h-full">
            {shouldLoad && !hasError ? (
                <>
                    {!isLoaded && (
                        <div className="absolute inset-0 bg-[var(--bg-secondary)] flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
                        </div>
                    )}
                    <Image
                        key={retryCount}
                        src={srcWithRetry}
                        alt={alt}
                        fill
                        className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
                        unoptimized
                        onLoad={handleLoad}
                        onError={handleError}
                    />
                </>
            ) : hasError ? (
                <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center">
                    <span className="text-[10px] text-[var(--text-muted)]">!</span>
                </div>
            ) : (
                <div className="w-full h-full bg-[var(--bg-secondary)]" />
            )}
        </div>
    );
}
