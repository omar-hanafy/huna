import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StorageProvider } from './StorageProvider';
import { HunaDatabase } from './indexeddb/db';
import { IndexedDbStorage } from './indexeddb/IndexedDbStorage';
import {
  useAlertSessions,
  useCopingCard,
  useDay,
  useDebouncedWrite,
  useJournalEntries,
  useLadderItems,
  useLastSafetyCheck,
  usePreferences,
} from './hooks';
import { createDayRecord } from './types';

let counter = 0;
function freshStorage(): IndexedDbStorage {
  counter += 1;
  return new IndexedDbStorage(new HunaDatabase(`huna-hooks-${counter}`));
}

function wrap(storage: IndexedDbStorage, ui: React.ReactNode) {
  return render(
    <StorageProvider storage={storage} legacyBlob={null}>
      {ui}
    </StorageProvider>,
  );
}

describe('live read hooks', () => {
  it('usePreferences resolves the stored preferences', async () => {
    const storage = freshStorage();
    await storage.savePreferences({ locale: 'en' });

    function Probe() {
      const preferences = usePreferences();
      return <span data-testid="locale">{preferences?.locale ?? 'loading'}</span>;
    }

    wrap(storage, <Probe />);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
  });

  /** The property that removes cross-tab clobbering: reads follow writes. */
  it('useDay re-renders when the underlying record changes', async () => {
    const storage = freshStorage();
    await storage.saveDay(createDayRecord('2026-08-17', 1));

    function Probe() {
      const day = useDay('2026-08-17');
      return <span data-testid="sleep">{String(day?.sleepHours ?? 'none')}</span>;
    }

    wrap(storage, <Probe />);
    await waitFor(() => expect(screen.getByTestId('sleep')).toHaveTextContent('none'));

    await storage.updateDay('2026-08-17', { sleepHours: 7 });
    await waitFor(() => expect(screen.getByTestId('sleep')).toHaveTextContent('7'));
  });

  it('the remaining read hooks resolve without error', async () => {
    const storage = freshStorage();

    function Probe() {
      const journal = useJournalEntries();
      const ladder = useLadderItems();
      const card = useCopingCard();
      const check = useLastSafetyCheck();
      const sessions = useAlertSessions();
      return (
        <span data-testid="summary">
          {[
            journal?.length,
            ladder?.length,
            card ? 'card' : '',
            check === null ? 'null' : 'check',
            sessions?.length,
          ].join('|')}
        </span>
      );
    }

    wrap(storage, <Probe />);
    await waitFor(() => expect(screen.getByTestId('summary')).toHaveTextContent('0|0|card|null|0'));
  });
});

describe('useDebouncedWrite', () => {
  function Editor() {
    const { schedule } = useDebouncedWrite(50);
    return (
      <input
        aria-label="note"
        onChange={(event) => {
          const value = event.target.value;
          schedule((instance) => instance.updateDay('2026-08-17', { note: value }));
        }}
      />
    );
  }

  /**
   * Defect 10: the previous hook serialised the whole application state on
   * every keystroke.
   */
  it('writes once after typing settles, not once per keystroke', async () => {
    const storage = freshStorage();
    const updateDay = vi.spyOn(storage, 'updateDay');

    wrap(storage, <Editor />);
    // No inter-key delay, so all four keystrokes land inside one debounce window.
    await userEvent.type(screen.getByLabelText('note'), 'مساء', { delay: null });

    await waitFor(() => expect(updateDay).toHaveBeenCalledTimes(1));
    expect((await storage.getDay('2026-08-17'))?.note).toBe('مساء');
  });

  /** A fast navigation must not drop what the user just typed. */
  it('flushes a pending write when the component unmounts', async () => {
    const storage = freshStorage();
    const updateDay = vi.spyOn(storage, 'updateDay');

    const view = wrap(storage, <Editor />);
    await userEvent.type(screen.getByLabelText('note'), 'x', { delay: null });
    view.unmount();

    await waitFor(() => expect(updateDay).toHaveBeenCalledTimes(1));
  });

  it('does nothing on unmount when there is no pending write', async () => {
    const storage = freshStorage();
    const updateDay = vi.spyOn(storage, 'updateDay');

    const view = wrap(storage, <Editor />);
    view.unmount();

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(updateDay).not.toHaveBeenCalled();
  });
});
