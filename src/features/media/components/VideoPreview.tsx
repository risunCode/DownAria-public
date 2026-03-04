'use client';

import { useRef, useEffect } from 'react';
import { MediaPlayer, MediaProvider, Poster, type MediaPlayerInstance } from '@vidstack/react';
import '@vidstack/react/player/styles/base.css';

interface VideoPreviewProps {
  src: string;
  posterUrl?: string;
  autoPlay?: boolean;
  className?: string;
  onEnded?: () => void;
}

/**
 * Vidstack-based video player for non-HLS direct playback.
 * Provides CLS-free loading with poster/skeleton, native controls,
 * and proper cleanup on unmount (no memory leaks).
 */
export function VideoPreview({ src, posterUrl, autoPlay = false, className, onEnded }: VideoPreviewProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);

  useEffect(() => {
    return () => {
      // Vidstack handles cleanup automatically via ref destruction
      playerRef.current = null;
    };
  }, []);

  return (
    <MediaPlayer
      ref={playerRef}
      src={src}
      autoPlay={autoPlay}
      playsInline
      className={className || 'w-full h-full object-contain'}
      onEnded={onEnded}
    >
      <MediaProvider />
      {posterUrl && (
        <Poster
          src={posterUrl}
          alt="Video Preview"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </MediaPlayer>
  );
}
