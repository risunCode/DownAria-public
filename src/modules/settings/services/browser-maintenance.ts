function deleteIndexedDbDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
    setTimeout(resolve, 2000);
  });
}

export async function deleteAllIndexedDbDatabases(): Promise<void> {
  if (!('indexedDB' in window) || typeof window.indexedDB.databases !== 'function') {
    return;
  }

  const databases = await window.indexedDB.databases();
  await Promise.all(
    databases.map((database) => {
      if (!database.name) {
        return Promise.resolve();
      }
      return deleteIndexedDbDatabase(database.name);
    })
  );
}

export async function clearBrowserCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

export async function clearAllClientData(): Promise<void> {
  localStorage.clear();
  sessionStorage.clear();

  try {
    await clearBrowserCaches();
  } catch {
    // Ignore cache cleanup failures during full reset.
  }

  try {
    await deleteAllIndexedDbDatabases();
  } catch {
    // Ignore IndexedDB cleanup failures during full reset.
  }
}
