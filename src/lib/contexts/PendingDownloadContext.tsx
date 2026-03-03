'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { MediaData, PlatformId } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/storage';

export interface QueuedMedia {
  id: string;
  mediaData: MediaData;
  platform: PlatformId;
  addedAt: number;
}

interface PendingDownloadContextType {
  mediaData: MediaData | null;
  setMediaData: (data: MediaData | null) => void;
  clearMediaData: () => void;
  // Queue management
  queue: QueuedMedia[];
  addToQueue: (media: MediaData, platform: PlatformId) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  isQueueMinimized: boolean;
  setQueueMinimized: (v: boolean) => void;
}

const PendingDownloadContext = createContext<PendingDownloadContextType | null>(null);

export function PendingDownloadProvider({ children }: { children: ReactNode }) {
  const [mediaData, setMediaDataState] = useState<MediaData | null>(null);
  const [queue, setQueue] = useState<QueuedMedia[]>([]);
  const [isQueueMinimized, setQueueMinimized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUEUE);
      if (saved) {
        const parsed = JSON.parse(saved) as QueuedMedia[];
        setQueue(parsed);
      }
    } catch {
      // Ignore parse errors
    }
    setIsHydrated(true);
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (queue.length > 0) {
        localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
      } else {
        localStorage.removeItem(STORAGE_KEYS.QUEUE);
      }
    } catch {
      // Ignore storage errors
    }
  }, [queue, isHydrated]);

  const setMediaData = useCallback((data: MediaData | null) => {
    setMediaDataState(data);
  }, []);

  const clearMediaData = useCallback(() => {
    setMediaDataState(null);
  }, []);

  const addToQueue = useCallback((media: MediaData, platform: PlatformId) => {
    const id = `mq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setQueue(prev => {
      const updated = [...prev, { id, mediaData: media, platform, addedAt: Date.now() }];
      // Save immediately
      try {
        localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
    setQueueMinimized(false);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => {
      const updated = prev.filter(item => item.id !== id);
      // Save immediately
      try {
        if (updated.length > 0) {
          localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(updated));
        } else {
          localStorage.removeItem(STORAGE_KEYS.QUEUE);
        }
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.QUEUE);
    } catch {
      // Ignore
    }
  }, []);



  return (
    <PendingDownloadContext.Provider value={{
      mediaData, setMediaData, clearMediaData,
      queue, addToQueue, removeFromQueue, clearQueue,
      isQueueMinimized, setQueueMinimized
    }}>
      {children}
    </PendingDownloadContext.Provider>
  );
}

export function usePendingDownload() {
  const context = useContext(PendingDownloadContext);
  if (!context) {
    throw new Error('usePendingDownload must be used within PendingDownloadProvider');
  }
  return context;
}
