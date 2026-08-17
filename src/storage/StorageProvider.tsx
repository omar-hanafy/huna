import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppStorage } from './AppStorage';
import { StorageContext, type StorageContextValue, type StorageProblem } from './context';
import { IndexedDbStorage } from './indexeddb/IndexedDbStorage';
import { migrateFromSakinaV1, readLegacyBlob, type MigrationResult } from './migrations/fromSakinaV1';
import { StorageQuotaError, StorageUnavailableError } from './types';

interface StorageProviderProps {
  children: ReactNode;
  /** Injected by tests; production builds the IndexedDB implementation. */
  storage?: AppStorage;
  /** Injected by tests so the legacy read is not tied to a real localStorage. */
  legacyBlob?: string | null;
}

export function StorageProvider({ children, storage, legacyBlob }: StorageProviderProps) {
  const instance = useMemo(() => storage ?? new IndexedDbStorage(), [storage]);
  const [problem, setProblem] = useState<StorageProblem>(null);
  const [migration, setMigration] = useState<MigrationResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const blob = legacyBlob === undefined ? readLegacyBlob() : legacyBlob;

    instance
      .initialise()
      .then(() => migrateFromSakinaV1(blob, instance))
      .then((result) => {
        if (!cancelled) setMigration(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // A failed migration must not block the app: the legacy blob is still
        // on disk and can be imported manually from settings.
        console.error('Legacy migration failed', error);
        if (error instanceof StorageQuotaError) setProblem('quota');
        else if (error instanceof StorageUnavailableError) setProblem('unavailable');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [instance, legacyBlob]);

  const value = useMemo<StorageContextValue>(
    () => ({
      storage: instance,
      problem,
      reportProblem: (error: unknown) => {
        if (error instanceof StorageQuotaError) setProblem('quota');
        else if (error instanceof StorageUnavailableError) setProblem('unavailable');
        else throw error;
      },
      clearProblem: () => setProblem(null),
      migration,
      ready,
    }),
    [instance, problem, migration, ready],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}
