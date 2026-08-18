import { afterEach, describe, expect, it, vi } from 'vitest';
import * as download from '../lib/download';
import {
  collectEmergencyBundle,
  runEmergencyExport,
  safeLocalStorage,
  type ReadableStore,
} from './emergencyExport';
import { HunaDatabase } from './indexeddb/db';
import { createDayRecord } from './types';

afterEach(() => {
  window.localStorage.clear();
});

/** A minimal in-memory Storage stand-in, so no global has to be replaced. */
function fakeStore(entries: Record<string, string>): ReadableStore {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (index: number) => keys[index] ?? null,
    getItem: (key: string) => entries[key] ?? null,
  };
}

let counter = 0;
function freshDatabase(): HunaDatabase {
  counter += 1;
  return new HunaDatabase(`huna-emergency-${counter}`);
}

describe('collectEmergencyBundle', () => {
  it('stamps the bundle so it is recognisable later', async () => {
    const bundle = await collectEmergencyBundle(fakeStore({}), freshDatabase());
    expect(bundle.kind).toBe('huna-emergency-export');
    expect(typeof bundle.exportedAt).toBe('string');
  });

  it('parses JSON entries and passes plain strings through untouched', async () => {
    const bundle = await collectEmergencyBundle(
      fakeStore({ 'sakina.app-state.v1': '{"version":1}', plain: 'not json' }),
      freshDatabase(),
    );
    const local = bundle.localStorage as Record<string, unknown>;
    expect(local['sakina.app-state.v1']).toEqual({ version: 1 });
    expect(local['plain']).toBe('not json');
  });

  it('reads the real localStorage by default', async () => {
    window.localStorage.setItem('probe', '"value"');
    const bundle = await collectEmergencyBundle(undefined, freshDatabase());
    expect((bundle.localStorage as Record<string, unknown>)['probe']).toBe('value');
  });

  /**
   * The rescue is worthless without this: the journal, the days, and the alert
   * sessions all live in IndexedDB, and the first version of this export
   * dumped only localStorage, which on a migrated install is empty.
   */
  it('dumps every IndexedDB table', async () => {
    const database = freshDatabase();
    await database.days.put(createDayRecord('2026-08-17', 1));

    const bundle = await collectEmergencyBundle(fakeStore({}), database);
    const tables = bundle.indexedDb as Record<string, unknown>;

    expect(Object.keys(tables)).toEqual(expect.arrayContaining(['days', 'alertSessions', 'journalEntries']));
    expect(tables.days).toHaveLength(1);
  });

  /**
   * The whole point of this path is that it runs when things are broken, so an
   * unreachable store must still produce a file rather than throwing.
   */
  it('flags the failure but still returns a bundle when there is no store', async () => {
    const bundle = await collectEmergencyBundle(null, freshDatabase());
    expect(bundle.localStorageError).toBe(true);
    expect(bundle.kind).toBe('huna-emergency-export');
    expect(bundle.localStorage).toEqual({});
  });

  it('flags the failure when the store throws part way through', async () => {
    const hostile: ReadableStore = {
      length: 2,
      key: (index: number) => (index === 0 ? 'ok' : null),
      getItem: (key: string) => {
        if (key === 'ok') return '"fine"';
        throw new DOMException('denied', 'SecurityError');
      },
    };
    const bundle = await collectEmergencyBundle(
      {
        ...hostile,
        key: (index: number) => {
          if (index === 1) throw new DOMException('denied', 'SecurityError');
          return 'ok';
        },
      },
      freshDatabase(),
    );
    expect(bundle.localStorageError).toBe(true);
    // Whatever was read before the failure is still handed back.
    expect((bundle.localStorage as Record<string, unknown>)['ok']).toBe('fine');
  });

  it('skips keys that report null', async () => {
    const store: ReadableStore = {
      length: 2,
      key: (index: number) => (index === 0 ? null : 'present'),
      getItem: () => '"value"',
    };
    const bundle = await collectEmergencyBundle(store, freshDatabase());
    expect(Object.keys(bundle.localStorage as Record<string, unknown>)).toEqual(['present']);
  });

  it('skips keys that vanish between enumeration and read', async () => {
    const store: ReadableStore = {
      length: 1,
      key: () => 'gone',
      getItem: () => null,
    };
    const bundle = await collectEmergencyBundle(store, freshDatabase());
    expect(bundle.localStorage).toEqual({});
  });
});

describe('safeLocalStorage', () => {
  it('returns the real store when it is reachable', () => {
    expect(safeLocalStorage()).not.toBeNull();
  });
});

describe('runEmergencyExport', () => {
  /**
   * Named a rescue, not a backup: it is a raw dump written when the app is too
   * broken to build a proper export, and a user with both files needs to be
   * able to tell them apart.
   */
  it('downloads the bundle under a dated rescue filename', async () => {
    const downloadJson = vi.spyOn(download, 'downloadJson').mockImplementation(() => {});
    await runEmergencyExport();

    expect(downloadJson).toHaveBeenCalledTimes(1);
    const [filename, data] = downloadJson.mock.calls[0]!;
    expect(filename).toMatch(/^huna-rescue-\d{4}-\d{2}-\d{2}\.json$/);
    expect((data as Record<string, unknown>).kind).toBe('huna-emergency-export');
  });
});
