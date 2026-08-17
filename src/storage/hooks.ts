import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef } from 'react';
import { useStorage, useStorageContext } from './useStorage';
import type { AppStorage } from './AppStorage';

/**
 * Reads that stay in sync with writes from any tab.
 *
 * Dexie's liveQuery observes the database rather than a copy held in memory,
 * which is what removes the last-write-wins clobbering the old localStorage
 * hook suffered from (defect 9).
 */
export function useLive<T>(query: (storage: AppStorage) => Promise<T>, deps: unknown[] = []): T | undefined {
  const storage = useStorage();
  // The query closure is recreated per render; deps decide when to re-subscribe.
  return useLiveQuery(() => query(storage), [storage, ...deps]);
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
 * The old hook serialised the entire application state on every keystroke
 * (defect 10). Text now settles for `delayMs` before it is written, and the
 * pending write is flushed on unmount so a fast navigation cannot drop it.
 */
export function useDebouncedWrite(delayMs = 400) {
  const write = useWrite();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<((storage: AppStorage) => Promise<unknown>) | null>(null);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const mutate = pending.current;
    pending.current = null;
    if (mutate) void write(mutate);
  }, [write]);

  const schedule = useCallback(
    (mutate: (storage: AppStorage) => Promise<unknown>) => {
      pending.current = mutate;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => flush, [flush]);

  return { schedule, flush };
}
