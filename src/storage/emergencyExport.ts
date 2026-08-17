import { backupFilename, downloadJson } from '../lib/download';

/**
 * Last-resort export used by the error boundary, when the normal settings
 * screen may be unreachable.
 *
 * This is the one module outside the storage implementation permitted to read
 * raw persistence, because it must work when higher layers are broken. It
 * deliberately dumps whatever it finds rather than validating anything.
 *
 * Phase 1 extends this to also dump the IndexedDB tables.
 */
export function collectEmergencyBundle(): Record<string, unknown> {
  const bundle: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    kind: 'huna-emergency-export',
  };

  const local: Record<string, unknown> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;
      try {
        local[key] = JSON.parse(raw) as unknown;
      } catch {
        local[key] = raw;
      }
    }
  } catch {
    // Storage can be unavailable entirely (Safari private mode). An export
    // containing only what we could reach still beats no export.
    bundle.localStorageError = true;
  }
  bundle.localStorage = local;

  return bundle;
}

export function runEmergencyExport(): void {
  downloadJson(backupFilename(), collectEmergencyBundle());
}
