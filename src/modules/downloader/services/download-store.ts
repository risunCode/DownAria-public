'use client';

import { useSyncExternalStore } from 'react';

import { type DownloadTaskState } from '@/modules/downloader/model/preview';
import { createIdleDownloadTaskState } from '@/modules/downloader/services/preview';

type Listener = () => void;

const controllers = new Map<string, AbortController>();

export function registerController(key: string, ctrl: AbortController): void {
  controllers.set(key, ctrl);
}

export function removeController(key: string): void {
  controllers.delete(key);
}

export function cancelDownload(key: string): void {
  const current = getDownloadTaskState(key);
  controllers.get(key)?.abort();
  controllers.delete(key);
  if (current.jobId) {
    void fetch(`/api/jobs/${encodeURIComponent(current.jobId)}`, {
      method: 'DELETE',
      cache: 'no-store',
      credentials: 'include',
    }).catch(() => undefined);
  }
  if (current.status !== 'completed' && current.status !== 'error') {
    setDownloadTaskState(key, { status: 'cancelled', progress: 0, message: 'Download cancelled' });
  }
}

const state = new Map<string, DownloadTaskState>();
const listeners = new Map<string, Set<Listener>>();
const updatedAt = new Map<string, number>();
const IDLE_STATE: DownloadTaskState = Object.freeze(createIdleDownloadTaskState());
const STATE_TTL_MS = 60 * 60 * 1000;

function cleanupStaleState(now = Date.now()) {
  for (const [key, ts] of updatedAt.entries()) {
    if (now - ts > STATE_TTL_MS) {
      state.delete(key);
      updatedAt.delete(key);
      if (!listeners.has(key)) {
        continue;
      }
      emit(key);
      listeners.delete(key);
    }
  }
}

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function getDownloadTaskState(key: string): DownloadTaskState {
  return state.get(key) || IDLE_STATE;
}

export function setDownloadTaskState(key: string, next: DownloadTaskState) {
  cleanupStaleState();
  state.set(key, next);
  updatedAt.set(key, Date.now());
  emit(key);
}

export function patchDownloadTaskState(key: string, next: Partial<DownloadTaskState>) {
  setDownloadTaskState(key, {
    ...getDownloadTaskState(key),
    ...next,
  });
}

export function resetDownloadTaskState(key: string) {
  state.delete(key);
  updatedAt.delete(key);
  emit(key);
}

export function subscribeDownloadTaskState(key: string, listener: Listener): () => void {
  const bucket = listeners.get(key) || new Set<Listener>();
  bucket.add(listener);
  listeners.set(key, bucket);

  return () => {
    const current = listeners.get(key);
    if (!current) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(key);
    }
  };
}

export function useDownloadTaskState(key: string): DownloadTaskState {
  return useSyncExternalStore(
    (listener) => subscribeDownloadTaskState(key, listener),
    () => getDownloadTaskState(key),
    () => IDLE_STATE
  );
}
