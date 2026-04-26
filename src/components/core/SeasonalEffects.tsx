'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { getSeasonalSettings, loadBackgroundFromDB, SeasonType, SeasonalSettings, startRandomRotation, stopRandomRotation, getUnifiedSettings } from '@/shared/storage';
import { APP_EVENTS, createLogger } from '@/shared/runtime';

const seasonalLogger = createLogger('SeasonalEffects');

// ═══════════════════════════════════════════════════════════════
// PARTICLE CONFIGURATIONS - OPTIMIZED & CHILL
// ═══════════════════════════════════════════════════════════════

interface ParticleConfig {
  count: number;
  emoji: string[];
  duration: { min: number; max: number }; // seconds to fall
  size: { min: number; max: number };
  opacity: { min: number; max: number };
  swing: number;
  rotate: boolean;
}

const PARTICLE_CONFIGS: Record<SeasonType, ParticleConfig> = {
  winter: {
    count: 30,
    emoji: ['❄️', '❄', '✧', '·'],
    duration: { min: 8, max: 15 },
    size: { min: 10, max: 22 },
    opacity: { min: 0.4, max: 0.9 },
    swing: 40,
    rotate: true,
  },
  spring: {
    count: 25,
    emoji: ['🌸', '🌺', '✿', '❀'],
    duration: { min: 10, max: 18 },
    size: { min: 14, max: 26 },
    opacity: { min: 0.5, max: 0.85 },
    swing: 60,
    rotate: true,
  },
  autumn: {
    count: 28,
    emoji: ['🍂', '🍁', '🍃'],
    duration: { min: 8, max: 14 },
    size: { min: 16, max: 30 },
    opacity: { min: 0.6, max: 0.95 },
    swing: 80,
    rotate: true,
  },
  locks: {
    count: 22,
    emoji: ['/custom_seasonal/worldlock_PngItem_1106058.png', '/custom_seasonal/diamondlock_kindpng_4497640.png'],
    duration: { min: 9, max: 16 },
    size: { min: 14, max: 20 },
    opacity: { min: 0.5, max: 0.9 },
    swing: 45,
    rotate: true,
  },
  off: {
    count: 0,
    emoji: [],
    duration: { min: 0, max: 0 },
    size: { min: 0, max: 0 },
    opacity: { min: 0, max: 0 },
    swing: 0,
    rotate: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// CSS-ONLY PARTICLES (NO JS ANIMATION LOOP = LOW MEMORY)
// ═══════════════════════════════════════════════════════════════

interface ParticleData {
  id: number;
  emoji: string;
  size: number;
  opacity: number;
  left: number;
  duration: number;
  delay: number;
  swing: number;
  rotate: boolean;
}

function generateParticles(config: ParticleConfig, intensity: number, speed: number): ParticleData[] {
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  const normalizedIntensity = Math.max(0, Math.min(200, intensity));
  const normalizedSpeed = Math.max(50, Math.min(150, speed));

  // Denser particle field without raising slider max beyond 200.
  // 0% still visible, 200% becomes significantly more crowded.
  const densityBoost = 0.9 + normalizedIntensity / 65;
  const rawCount = config.count * densityBoost + normalizedIntensity * 0.12;
  const count = Math.min(180, Math.max(6, Math.round(rawCount)));

  // More lively horizontal movement at higher intensity.
  const swingBoost = 1 + normalizedIntensity / 220;
  const durationFactor = 100 / normalizedSpeed;
  
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: config.emoji[Math.floor(Math.random() * config.emoji.length)],
    size: rand(config.size.min, config.size.max),
    opacity: rand(config.opacity.min, config.opacity.max),
    left: Math.random() * 100,
    // Inject faster particles periodically so the scene feels busier.
    duration: rand(config.duration.min, config.duration.max) * durationFactor * (i % 5 === 0 ? 0.72 : 1),
    // Heavier negative delay spread avoids synchronized gaps.
    delay: -rand(0, 32) - (i % 3) * 6,
    swing: rand(-config.swing * swingBoost, config.swing * swingBoost),
    rotate: config.rotate,
  }));
}

function isImageParticle(value: string): boolean {
  return value.startsWith('/custom_seasonal/');
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND COMPONENT - MEMORY OPTIMIZED
// ═══════════════════════════════════════════════════════════════

/**
 * Memory-optimized background renderer
 * 
 * Optimizations:
 * 1. Single blob URL - reused, not recreated
 * 2. GPU acceleration via will-change and transform
 * 3. Video: preload="none" until visible, low buffer
 * 4. Pause video when tab not visible (Page Visibility API)
 * 5. Use CSS containment for paint isolation
 */
function Background({ settings, backgroundUrl, isModalOpen }: { settings: SeasonalSettings; backgroundUrl: string; isModalOpen: boolean }) {
  const bg = settings.customBackground;
  const [isVisible, setIsVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Pause video when tab is not visible (saves memory & CPU)
  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  
  // Handle video play/pause based on visibility AND modal state
  // Pause when tab not visible OR modal is open (saves CPU/GPU)
  useEffect(() => {
    if (videoRef.current) {
      const shouldPlay = isVisible && !isModalOpen;
      if (shouldPlay) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVisible, isModalOpen]);
  
  // Sync sound settings from seasonal config
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const volume = Math.max(0, Math.min(100, settings.backgroundVolume ?? 50)) / 100;
    video.volume = volume;
    video.muted = !settings.backgroundSound || isModalOpen;
  }, [settings.backgroundSound, settings.backgroundVolume, isModalOpen]);
  
  if (!bg) return null;

  const opacity = (settings.backgroundOpacity || 20) / 100;
  const blur = settings.backgroundBlur ? `blur(${settings.backgroundBlur}px)` : undefined;
  const zoom = Math.max(65, Math.min(150, settings.backgroundZoom || 100)) / 100;
  const isGif = bg.mimeType === 'image/gif';
  
  // Common optimized styles
  const optimizedStyles: React.CSSProperties = {
    zIndex: 0,
    opacity,
    filter: blur,
    objectPosition: `${bg.position.x}% ${bg.position.y}%`,
    // GPU acceleration
    willChange: 'transform',
    transform: `translateZ(0) scale(${zoom})`,
    // Paint containment - isolates repaints
    contain: 'paint',
  };

  // Video background
  // Mute when modal is open to prevent sound overlap with preview
  const shouldMute = !settings.backgroundSound || isModalOpen;
  
  if (bg.type === 'video' && !isGif) {
    return (
      <video
        ref={videoRef}
        src={backgroundUrl}
        autoPlay={isVisible}
        loop
        muted={shouldMute}
        playsInline
        // Memory optimizations
        preload="metadata" // Don't preload full video
        disablePictureInPicture
        disableRemotePlayback
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={optimizedStyles}
      />
    );
  }
  
  // GIF background (uses img tag, loops automatically)
  if (isGif) {
    return (
      <img
        src={backgroundUrl}
        alt=""
        loading="eager"
        decoding="async"
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={optimizedStyles}
      />
    );
  }

  // Static image - use CSS background for better caching
  return (
    <div 
      className="fixed inset-0 bg-cover bg-no-repeat pointer-events-none"
      style={{
        ...optimizedStyles,
        backgroundImage: `url(${backgroundUrl})`,
        backgroundPosition: `${bg.position.x}% ${bg.position.y}%`,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SeasonalEffects() {
  const [settings, setSettings] = useState<SeasonalSettings | null>(null);
  const [experimentalEnabled, setExperimentalEnabled] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const previousUrlRef = useRef<string | null>(null);

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, []);

  // Detect modal/sheet open state by watching DOM
  useEffect(() => {
    const checkForModals = () => {
      // Check for common modal indicators
      const hasModal = !!(
        document.querySelector('[role="dialog"]') ||
        document.querySelector('[data-radix-dialog-content]') ||
        document.querySelector('.swal2-container') ||
        document.querySelector('[class*="modal"]') ||
        document.querySelector('[class*="sheet"]') ||
        document.body.style.overflow === 'hidden'
      );
      setIsModalOpen(hasModal);
    };

    // Initial check
    checkForModals();

    // Watch for DOM changes
    const observer = new MutationObserver(checkForModals);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => observer.disconnect();
  }, []);

  // Generate particles (memoized, doesn't change with modal state)
  const particles = useMemo(() => {
    if (!settings || settings.season === 'off') return [];
    return generateParticles(
      PARTICLE_CONFIGS[settings.season],
      settings.intensity ?? 50,
      settings.particleSpeed ?? 100
    );
  }, [settings?.season, settings?.intensity, settings?.particleSpeed]);

  // Apply custom background class and opacity to body
  useEffect(() => {
    const showCustomBackground = experimentalEnabled && settings?.backgroundEnabled !== false && settings?.customBackground && backgroundUrl;

    if (showCustomBackground) {
      document.body.classList.add('has-custom-background');
      document.documentElement.style.setProperty('--bg-opacity', `${settings.backgroundOpacity || 8}%`);
    } else {
      document.body.classList.remove('has-custom-background');
      document.documentElement.style.removeProperty('--bg-opacity');
    }

    return () => {
      document.body.classList.remove('has-custom-background');
      document.documentElement.style.removeProperty('--bg-opacity');
    };
  }, [experimentalEnabled, settings?.backgroundEnabled, settings?.customBackground, settings?.backgroundOpacity, backgroundUrl]);

  // Load settings
  useEffect(() => {
    const load = async () => {
      const s = getSeasonalSettings();
      const unified = getUnifiedSettings();
      setSettings(s);
      setExperimentalEnabled(unified.experimentalEnabled !== false);
      
      // Start random rotation if in random mode
      if (s.mode === 'random') {
        startRandomRotation(s.randomInterval);
      }
      
      // Always try to load background from IndexedDB
      if (s.customBackground) {
        try {
          const url = await loadBackgroundFromDB();
          if (url) {
            // Revoke previous URL to free memory
            if (previousUrlRef.current && previousUrlRef.current !== url) {
              URL.revokeObjectURL(previousUrlRef.current);
            }
            previousUrlRef.current = url;
            setBackgroundUrl(url);
          } else {
            setBackgroundUrl(null);
          }
        } catch (err) {
          seasonalLogger.error('Failed to load background', err, { devOnly: true });
          setBackgroundUrl(null);
        }
      } else {
        // Clear background and revoke URL
        if (previousUrlRef.current) {
          URL.revokeObjectURL(previousUrlRef.current);
          previousUrlRef.current = null;
        }
        setBackgroundUrl(null);
      }
    };
    load();
    
    // Also reload when seasonal settings change (same tab)
    const handleSeasonalChange = () => load();
    window.addEventListener(APP_EVENTS.seasonalSettingsChanged, handleSeasonalChange);
    
    // Listen for random season changes
    const handleRandomChange = (e: CustomEvent<{ season: SeasonType }>) => {
      setSettings(prev => prev ? { ...prev, season: e.detail.season } : null);
    };
    window.addEventListener(APP_EVENTS.seasonalRandomChanged, handleRandomChange as EventListener);
    
    return () => {
      window.removeEventListener(APP_EVENTS.seasonalSettingsChanged, handleSeasonalChange);
      window.removeEventListener(APP_EVENTS.seasonalRandomChanged, handleRandomChange as EventListener);
      // Stop random rotation on unmount
      stopRandomRotation();
    };
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (e.key === 'downaria_seasonal') {
        const s = getSeasonalSettings();
        setSettings(s);
        
        if (s.customBackground) {
          const url = await loadBackgroundFromDB();
          setBackgroundUrl(url);
        } else {
          setBackgroundUrl(null);
        }
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Listen for unified settings changes (experimental toggle)
  useEffect(() => {
    const syncExperimental = () => {
      const unified = getUnifiedSettings();
      setExperimentalEnabled(unified.experimentalEnabled !== false);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'downaria_settings') {
        syncExperimental();
      }
    };

    const handleSettingsChanged = () => syncExperimental();

    syncExperimental();
    window.addEventListener(APP_EVENTS.settingsChanged, handleSettingsChanged as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(APP_EVENTS.settingsChanged, handleSettingsChanged as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (!settings || (settings.season === 'off' && !settings.customBackground)) return null;

  // Check if custom background should be shown
  const showCustomBackground = experimentalEnabled && settings.backgroundEnabled !== false && settings.customBackground && backgroundUrl;

  // Determine if particles should show (hide when modal is open)
  const showParticles = !isModalOpen && 
    settings.season !== 'off' && 
    (!settings.customBackground || settings.particlesWithBackground);

  const particleLayerOpacity = Math.max(10, Math.min(100, settings.particleOpacity ?? 50)) / 100;

  // Card opacity from settings (default 75% when custom background is set - best for readability)
  const cardOpacity = showCustomBackground ? (settings.cardOpacity ?? 75) / 100 : 1;

  return (
    <>
      {/* Custom Background - behind everything */}
      {showCustomBackground && (
        <Background settings={settings} backgroundUrl={backgroundUrl} isModalOpen={isModalOpen} />
      )}

      {/* CSS-Only Particles - BEHIND content, slightly transparent */}
      {showParticles && particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1, opacity: particleLayerOpacity }}>
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute animate-fall"
              style={{
                left: `${p.left}%`,
                fontSize: `${p.size}px`,
                opacity: p.opacity,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                '--swing': `${p.swing}px`,
                '--rotate': p.rotate ? '360deg' : '0deg',
              } as React.CSSProperties}
            >
              {isImageParticle(p.emoji) ? (
                <img
                  src={p.emoji}
                  alt=""
                  className="w-full h-full object-contain"
                  style={{ width: `${p.size}px`, height: `${p.size}px` }}
                />
              ) : (
                p.emoji
              )}
            </div>
          ))}
          
          {/* CSS Animation - runs on GPU, no JS needed */}
          <style jsx global>{`
            @keyframes fall {
              0% {
                transform: translateY(-5vh) translateX(0) rotate(0deg);
              }
              25% {
                transform: translateY(25vh) translateX(var(--swing)) rotate(calc(var(--rotate) * 0.25));
              }
              50% {
                transform: translateY(50vh) translateX(calc(var(--swing) * -0.5)) rotate(calc(var(--rotate) * 0.5));
              }
              75% {
                transform: translateY(75vh) translateX(var(--swing)) rotate(calc(var(--rotate) * 0.75));
              }
              100% {
                transform: translateY(105vh) translateX(0) rotate(var(--rotate));
              }
            }
            
            .animate-fall {
              animation: fall linear infinite;
              will-change: transform;
            }
          `}</style>
        </div>
      )}
    </>
  );
}

export default SeasonalEffects;
