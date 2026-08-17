import { afterEach, describe, expect, it, vi } from 'vitest';
import * as download from '../lib/download';
import {
  collectEmergencyBundle,
  runEmergencyExport,
  safeLocalStorage,
  type ReadableStore,
} from './emergencyExport';

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

describe('collectEmergencyBundle', () => {
  it('stamps the bundle so it is recognisable later', () => {
    const bundle = collectEmergencyBundle(fakeStore({}));
    expect(bundle.kind).toBe('huna-emergency-export');
    expect(typeof bundle.exportedAt).toBe('string');
  });

  it('parses JSON entries and passes plain strings through untouched', () => {
    const bundle = collectEmergencyBundle(
      fakeStore({ 'sakina.app-state.v1': '{"version":1}', plain: 'not json' }),
    );
    const local = bundle.localStorage as Record<string, unknown>;
    expect(local['sakina.app-state.v1']).toEqual({ version: 1 });
    expect(local['plain']).toBe('not json');
  });

  it('reads the real localStorage by default', () => {
    window.localStorage.setItem('probe', '"value"');
    const local = collectEmergencyBundle().localStorage as Record<string, unknown>;
    expect(local['probe']).toBe('value');
  });

  /**
   * The whole point of this path is that it runs when things are broken, so an
   * unreachable store must still produce a file rather than throwing.
   */
  it('flags the failure but still returns a bundle when there is no store', () => {
    const bundle = collectEmergencyBundle(null);
    expect(bundle.localStorageError).toBe(true);
    expect(bundle.kind).toBe('huna-emergency-export');
    expect(bundle.localStorage).toEqual({});
  });

  it('flags the failure when the store throws part way through', () => {
    const hostile: ReadableStore = {
      length: 2,
      key: (index: number) => (index === 0 ? 'ok' : null),
      getItem: (key: string) => {
        if (key === 'ok') return '"fine"';
        throw new DOMException('denied', 'SecurityError');
      },
    };
    const bundle = collectEmergencyBundle({
      ...hostile,
      key: (index: number) => {
        if (index === 1) throw new DOMException('denied', 'SecurityError');
        return 'ok';
      },
    });
    expect(bundle.localStorageError).toBe(true);
    // Whatever was read before the failure is still handed back.
    expect((bundle.localStorage as Record<string, unknown>)['ok']).toBe('fine');
  });

  it('skips keys that report null', () => {
    const store: ReadableStore = {
      length: 2,
      key: (index: number) => (index === 0 ? null : 'present'),
      getItem: () => '"value"',
    };
    const local = collectEmergencyBundle(store).localStorage as Record<string, unknown>;
    expect(Object.keys(local)).toEqual(['present']);
  });

  it('skips keys that vanish between enumeration and read', () => {
    const store: ReadableStore = {
      length: 1,
      key: () => 'gone',
      getItem: () => null,
    };
    expect(collectEmergencyBundle(store).localStorage).toEqual({});
  });
});

describe('safeLocalStorage', () => {
  it('returns the real store when it is reachable', () => {
    expect(safeLocalStorage()).not.toBeNull();
  });
});

describe('runEmergencyExport', () => {
  it('downloads the bundle under a dated filename', () => {
    const downloadJson = vi.spyOn(download, 'downloadJson').mockImplementation(() => {});
    runEmergencyExport();

    expect(downloadJson).toHaveBeenCalledTimes(1);
    const [filename, data] = downloadJson.mock.calls[0]!;
    expect(filename).toMatch(/^huna-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect((data as Record<string, unknown>).kind).toBe('huna-emergency-export');
  });
});
