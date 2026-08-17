import { backupFilename, downloadJson } from '../lib/download';

/** The subset of the Storage API this module needs. Injectable for tests. */
export type ReadableStore = Pick<Storage, 'length' | 'key' | 'getItem'>;

/**
 * Accessing `localStorage` can itself throw, for example in Safari with site
 * data blocked, so even obtaining the store is guarded.
 */
export function safeLocalStorage(): ReadableStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Last-resort export used by the error boundary, when the settings screen may
 * be unreachable.
 *
 * This is the one module outside the storage implementation permitted to read
 * raw persistence, because it has to work when the layers above it are broken.
 * It dumps whatever it can reach and validates nothing: a partial export beats
 * no export when someone is trying to rescue a journal.
 *
 * Phase 4 extends this to also dump the IndexedDB tables.
 */
export function collectEmergencyBundle(
  store: ReadableStore | null = safeLocalStorage(),
): Record<string, unknown> {
  const bundle: Record<string, unknown> = {
    kind: 'huna-emergency-export',
    exportedAt: new Date().toISOString(),
  };

  const local: Record<string, unknown> = {};
  if (store === null) {
    bundle.localStorageError = true;
  } else {
    try {
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        if (key === null) continue;
        const raw = store.getItem(key);
        if (raw === null) continue;
        try {
          local[key] = JSON.parse(raw) as unknown;
        } catch {
          local[key] = raw;
        }
      }
    } catch {
      bundle.localStorageError = true;
    }
  }

  bundle.localStorage = local;
  return bundle;
}

export function runEmergencyExport(): void {
  downloadJson(backupFilename(), collectEmergencyBundle());
}
