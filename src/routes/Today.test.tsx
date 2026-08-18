import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '../app/Providers';
import { HunaDatabase } from '../storage/indexeddb/db';
import { IndexedDbStorage } from '../storage/indexeddb/IndexedDbStorage';
import type { DayRecord } from '../storage/types';
import { toDateKey } from '../lib/date';
import { Today } from './Today';

let counter = 0;
let storage: IndexedDbStorage;

beforeEach(() => {
  counter += 1;
  storage = new IndexedDbStorage(new HunaDatabase(`huna-today-${counter}`));
});

const todayKey = () => toDateKey(new Date());

function renderToday() {
  return render(
    <Providers storage={storage} legacyBlob={null}>
      <MemoryRouter>
        <Today />
      </MemoryRouter>
    </Providers>,
  );
}

describe('Today', () => {
  /**
   * The evening fields are uncontrolled, so their value is fixed at mount.
   * Rendering them before the stored day arrives meant either showing a blank
   * over a saved value, or remounting them and throwing away whatever the user
   * had started typing in the meantime. Neither is acceptable on the one screen
   * that promises it saves by itself.
   */
  it('waits for the stored day before offering the evening fields', async () => {
    let release: (record: DayRecord | null) => void = () => {};
    const gate = new Promise<DayRecord | null>((resolve) => {
      release = resolve;
    });
    const real = storage.getDay.bind(storage);
    let first = true;
    vi.spyOn(storage, 'getDay').mockImplementation((date: string) => {
      if (!first) return real(date);
      first = false;
      return gate;
    });

    const { container } = renderToday();
    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull());
    expect(screen.queryByLabelText('ساعات النوم')).toBeNull();

    release({ ...createStoredDay(), note: 'ليلة هادئة' });
    expect(await screen.findByLabelText('أكثر شيء ساعدني اليوم')).toHaveValue('ليلة هادئة');
  });

  it('keeps every evening field that was filled in', async () => {
    renderToday();

    const sleep = await screen.findByLabelText('ساعات النوم');
    await userEvent.type(sleep, '7');
    await userEvent.type(screen.getByLabelText('أكثر شيء ساعدني اليوم'), 'المشي');

    await waitFor(async () => {
      const day = await storage.getDay(todayKey());
      expect(day?.sleepHours).toBe(7);
      expect(day?.note).toBe('المشي');
    });
  });

  /** Out-of-range input poisons the backup, so it never reaches the store. */
  it('clamps a number the user types past its ceiling', async () => {
    renderToday();

    const sleep = await screen.findByLabelText('ساعات النوم');
    await userEvent.type(sleep, '900');

    await waitFor(async () => {
      expect((await storage.getDay(todayKey()))?.sleepHours).toBe(24);
    });
  });
});

function createStoredDay(): DayRecord {
  return {
    date: todayKey(),
    week: 1,
    tasks: {
      orientation: false,
      breathing: false,
      movement: false,
      checkins: false,
      relaxation: false,
      weekFocus: false,
    },
    activation: null,
    sleepHours: null,
    recoveryMinutes: null,
    note: '',
    busyDay: false,
    checkIns: [],
  };
}
