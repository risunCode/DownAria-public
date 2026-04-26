import { BACKGROUNDS_STORE, openAriaIndexDB } from './indexed-db-core';
import { STORAGE_KEYS } from './settings.model';
import { APP_EVENTS, dispatchAppEvent } from '@/shared/runtime';
import {
  type BackgroundPosition,
  type CustomBackground,
  DEFAULT_BACKGROUND_POSITION,
} from './seasonal';

const SEASONAL_STORE_NAME = BACKGROUNDS_STORE;
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const SEASONAL_KEY = STORAGE_KEYS.SEASONAL;

async function openSeasonalDB(): Promise<IDBDatabase> {
  return openAriaIndexDB();
}

function emitSeasonalChange(): void {
  dispatchAppEvent(APP_EVENTS.seasonalSettingsChanged);
}

export async function saveBackgroundBlob(blob: Blob): Promise<void> {
  const db = await openSeasonalDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SEASONAL_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(SEASONAL_STORE_NAME);

    const request = store.put({ id: 'background', blob });
    request.onsuccess = () => {
      emitSeasonalChange();
      resolve();
    };
    request.onerror = () => reject(new Error('Failed to save background'));
  });
}

export async function getBackgroundBlob(): Promise<Blob | null> {
  try {
    const db = await openSeasonalDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([SEASONAL_STORE_NAME], 'readonly');
      const store = transaction.objectStore(SEASONAL_STORE_NAME);

      const request = store.get('background');
      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteBackgroundBlob(): Promise<void> {
  try {
    const db = await openSeasonalDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([SEASONAL_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(SEASONAL_STORE_NAME);

      const request = store.delete('background');
      request.onsuccess = () => {
        emitSeasonalChange();
        resolve();
      };
      request.onerror = () => resolve();
    });
  } catch {
    return;
  }
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/x-m4v',
] as const;

const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'video/mp4': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
  'video/quicktime': [[0x00, 0x00, 0x00]],
  'video/x-msvideo': [[0x52, 0x49, 0x46, 0x46]],
  'video/x-matroska': [[0x1a, 0x45, 0xdf, 0xa3]],
  'video/x-m4v': [[0x00, 0x00, 0x00]],
};

async function validateFileMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  for (const signatures of Object.values(FILE_SIGNATURES)) {
    for (const sig of signatures) {
      let match = true;
      for (let i = 0; i < sig.length && i < bytes.length; i++) {
        if (bytes[i] !== sig[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
  }

  return false;
}

export async function processBackgroundFile(file: File): Promise<CustomBackground> {
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV, AVI, MKV, M4V`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const validMagic = await validateFileMagicBytes(file);
  if (!validMagic) {
    throw new Error('File content does not match its type. File may be corrupted or spoofed.');
  }

  await saveBackgroundBlob(file);

  const isVideo = file.type.startsWith('video/');
  const isGif = file.type === 'image/gif';

  return {
    type: isVideo || isGif ? 'video' : 'image',
    data: '', // Don't store blob URLs in settings/localStorage
    mimeType: file.type,
    size: file.size,
    position: { ...DEFAULT_BACKGROUND_POSITION },
  };
}

export async function loadBackgroundFromDB(): Promise<string | null> {
  const blob = await getBackgroundBlob();
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { SEASONAL_KEY };
