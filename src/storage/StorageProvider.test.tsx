import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageProvider } from './StorageProvider';
import { HunaDatabase } from './indexeddb/db';
import { IndexedDbStorage } from './indexeddb/IndexedDbStorage';
import { useStorage, useStorageContext } from './useStorage';
import { StorageQuotaError, StorageUnavailableError } from './types';
import { useWrite } from './hooks';

let counter = 0;
function freshStorage(): IndexedDbStorage {
  counter += 1;
  return new IndexedDbStorage(new HunaDatabase(`huna-provider-${counter}`));
}

const legacy = JSON.stringify({
  version: 1,
  days: {
    '2026-08-15': {
      date: '2026-08-15',
      week: 1,
      tasks: { orientation: true },
      vigilance: 6,
      sleepHours: 7,
      recoveryMinutes: 10,
      note: 'ملاحظة',
      checkIns: [],
    },
  },
  journal: [],
});

function Probe() {
  const { migration, ready, problem } = useStorageContext();
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="status">{migration?.status ?? 'none'}</span>
      <span data-testid="days">{migration?.days ?? -1}</span>
      <span data-testid="problem">{problem ?? 'none'}</span>
    </div>
  );
}

describe('StorageProvider', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('runs the legacy migration on mount and reports the result', async () => {
    render(
      <StorageProvider storage={freshStorage()} legacyBlob={legacy}>
        <Probe />
      </StorageProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(screen.getByTestId('status')).toHaveTextContent('migrated');
    expect(screen.getByTestId('days')).toHaveTextContent('1');
  });

  it('reports nothing-to-migrate when there is no legacy blob', async () => {
    render(
      <StorageProvider storage={freshStorage()} legacyBlob={null}>
        <Probe />
      </StorageProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('nothing-to-migrate'));
  });

  /** A broken migration must not stop the app booting. */
  it('becomes ready even when the migration throws', async () => {
    const storage = freshStorage();
    vi.spyOn(storage, 'getMeta').mockRejectedValue(new StorageUnavailableError());

    render(
      <StorageProvider storage={storage} legacyBlob={legacy}>
        <Probe />
      </StorageProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(screen.getByTestId('problem')).toHaveTextContent('unavailable');
  });

  it('surfaces a quota failure raised during migration', async () => {
    const storage = freshStorage();
    vi.spyOn(storage, 'getMeta').mockRejectedValue(new StorageQuotaError());

    render(
      <StorageProvider storage={storage} legacyBlob={legacy}>
        <Probe />
      </StorageProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('problem')).toHaveTextContent('quota'));
  });
});

describe('useStorage outside a provider', () => {
  it('fails loudly rather than silently returning undefined', () => {
    function Bare() {
      useStorage();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/StorageProvider/);
  });
});

describe('useWrite', () => {
  function Writer({ onDone }: { onDone: (ok: boolean) => void }) {
    const write = useWrite();
    const storage = useStorage();
    return (
      <button
        type="button"
        onClick={() => {
          void write(() => storage.savePreferences({ locale: 'en' })).then(onDone);
        }}
      >
        write
      </button>
    );
  }

  it('returns true and persists on success', async () => {
    const storage = freshStorage();
    const onDone = vi.fn();
    render(
      <StorageProvider storage={storage} legacyBlob={null}>
        <Writer onDone={onDone} />
      </StorageProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'write' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect((await storage.getPreferences()).locale).toBe('en');
  });

  /**
   * Defect 4: this is the path that used to be silent, leaving the UI claiming
   * "saved automatically" while nothing had persisted.
   */
  it('returns false and records the problem when the write is refused', async () => {
    const storage = freshStorage();
    vi.spyOn(storage, 'savePreferences').mockRejectedValue(new StorageQuotaError());
    const onDone = vi.fn();

    render(
      <StorageProvider storage={storage} legacyBlob={null}>
        <Writer onDone={onDone} />
        <Probe />
      </StorageProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'write' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(false));
    expect(screen.getByTestId('problem')).toHaveTextContent('quota');
  });

  it('rethrows a programmer error instead of disguising it as a storage problem', async () => {
    const storage = freshStorage();
    vi.spyOn(storage, 'savePreferences').mockRejectedValue(new TypeError('bug'));

    function Boom() {
      const write = useWrite();
      const instance = useStorage();
      return (
        <button
          type="button"
          onClick={() => {
            void write(() => instance.savePreferences({ locale: 'en' })).catch((error: unknown) => {
              (globalThis as Record<string, unknown>).__caught = error;
            });
          }}
        >
          boom
        </button>
      );
    }

    render(
      <StorageProvider storage={storage} legacyBlob={null}>
        <Boom />
      </StorageProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'boom' }));
    await waitFor(() => expect((globalThis as Record<string, unknown>).__caught).toBeInstanceOf(TypeError));
  });
});
