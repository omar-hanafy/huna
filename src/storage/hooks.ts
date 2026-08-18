import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef } from 'react';
import { useStorageContext } from './useStorage';
import type { AppStorage } from './AppStorage';
import { StorageQuotaError, StorageUnavailableError } from './types';

/**
 * Reads that stay in sync with writes from any tab.
 *
 * Dexie's liveQuery observes the database rather than a copy held in memory,
 * which is what removes the last-write-wins clobbering the old localStorage
 * hook suffered from (defect 9).
 *
 * Known storage failures are absorbed into the provider's problem banner
 * instead of being rethrown through render: a browser with IndexedDB blocked
 * should land on the designed "storage unavailable" notice, not the crash
 * screen.
 */
export function useLive<T>(query: (storage: AppStorage) => Promise<T>, deps: unknown[] = []): T | undefined {
  const { storage, reportProblem } = useStorageContext();
  // The query closure is recreated per render; deps decide when to re-subscribe.
  return useLiveQuery(
    () =>
      query(storage).catch((error: unknown) => {
        if (error instanceof StorageUnavailableError || error instanceof StorageQuotaError) {
          reportProblem(error);
          return undefined;
        }
        throw error;
      }),
    [storage, ...deps],
  );
}

export function usePreferences() {
  return useLive((storage) => storage.getPreferences());
}

export function useDay(date: string) {
  return useLive((storage) => storage.getDay(date), [date]);
}

export function useJournalEntries() {
  return useLive((storage) => storage.getJournalEntries());
}

export function useLadderItems() {
  return useLive((storage) => storage.getLadderItems());
}

export function useCopingCard() {
  return useLive((storage) => storage.getCopingCard());
}

export function useLastSafetyCheck() {
  return useLive((storage) => storage.getLastSafetyCheck());
}

export function useAlertSessions() {
  return useLive((storage) => storage.getAlertSessions());
}

/**
 * Wraps a write so a storage failure becomes visible UI state rather than an
 * unhandled rejection. Every mutating call in the app should go through this.
 */
export function useWrite() {
  const { storage, reportProblem } = useStorageContext();

  return useCallback(
    async (mutate: (storage: AppStorage) => Promise<unknown>): Promise<boolean> => {
      try {
        await mutate(storage);
        return true;
      } catch (error) {
        reportProblem(error);
        return false;
      }
    },
    [storage, reportProblem],
  );
}

/**
 * Trailing-edge debounce for free-text fields.
 *
 * Pending writes are keyed: repeated keystrokes in one field coalesce, while a
 * quick move to a second field keeps both writes. The previous version held a
 * single pending slot, so editing two fields within the delay silently
 * discarded the first field's write - real data loss on the evening log.
 *
 * Everything pending is flushed on unmount and when the page is hidden, so a
 * fast navigation or closing the PWA cannot drop the last edit.
 */
export function useDebouncedWrite(delayMs = 400) {
  const write = useWrite();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Map<string, (storage: AppStorage) => Promise<unknown>>());

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const batch = [...pending.current.values()];
    pending.current.clear();
    for (const mutate of batch) void write(mutate);
  }, [write]);

  const schedule = useCallback(
    (key: string, mutate: (storage: AppStorage) => Promise<unknown>) => {
      pending.current.set(key, mutate);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
    };
  }, [flush]);

  return { schedule, flush };
}
