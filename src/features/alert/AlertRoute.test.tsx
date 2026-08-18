import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '../../app/Providers';
import { HunaDatabase } from '../../storage/indexeddb/db';
import { IndexedDbStorage } from '../../storage/indexeddb/IndexedDbStorage';
import { StorageUnavailableError } from '../../storage/types';
import { AlertRoute } from './AlertRoute';

let counter = 0;
let storage: IndexedDbStorage;

beforeEach(() => {
  counter += 1;
  storage = new IndexedDbStorage(new HunaDatabase(`huna-alert-route-${counter}`));
});

function renderAlert() {
  return render(
    <Providers storage={storage} legacyBlob={null}>
      <MemoryRouter initialEntries={['/alert']}>
        <AlertRoute />
      </MemoryRouter>
    </Providers>,
  );
}

/** Makes every read fail the way a browser with storage blocked does. */
function blockStorage() {
  const unavailable = () => Promise.reject(new StorageUnavailableError());
  vi.spyOn(storage, 'getPreferences').mockImplementation(unavailable);
  vi.spyOn(storage, 'getLastSafetyCheck').mockImplementation(unavailable);
  vi.spyOn(storage, 'getOpenAlertSession').mockImplementation(unavailable);
  vi.spyOn(storage, 'saveAlertSession').mockImplementation(unavailable);
  vi.spyOn(storage, 'saveSafetyCheck').mockImplementation(unavailable);
}

describe('the alert flow', () => {
  it('asks the safety question first', async () => {
    renderAlert();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('خطر مباشر');
  });

  /**
   * The whole point of the app, in the browser where it works least well. A
   * blocked IndexedDB never resolves preferences, and gating the crisis screen
   * on them left it permanently blank: no numbers, no guidance, no way back.
   */
  it('still shows the crisis numbers when storage is blocked', async () => {
    blockStorage();
    renderAlert();

    await userEvent.click(await screen.findByRole('button', { name: 'نعم، قد يكون هناك خطر' }));

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('أمانك');
    // Egypt's verified numbers, and the way back into the exercise.
    expect(screen.getByRole('link', { name: /123/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /أنا في أمان الآن/ })).toBeInTheDocument();
  });

  /**
   * "This one isn't comfortable" returns to the picker, and the number the user
   * already reported has to survive the trip. The slider used to reset to its
   * default and overwrite the reading on the way back through.
   */
  it('keeps the reported activation when the user changes exercise', async () => {
    renderAlert();

    await userEvent.click(await screen.findByRole('button', { name: 'لا يوجد خطر مباشر محدد' }));
    await userEvent.click(await screen.findByRole('button', { name: /لم يتغيّر شيء/ }));

    // jsdom has no drag, and no default action for the arrow keys on a range,
    // so the change event is dispatched the way the browser would.
    const slider = await screen.findByRole('slider');
    fireEvent.change(slider, { target: { value: '9' } });
    const reported = Number((slider as HTMLInputElement).value);
    expect(reported).toBe(9);

    await userEvent.click(screen.getByRole('button', { name: /صوت أو حركة أفزعتني/ }));
    await userEvent.click(await screen.findByRole('button', { name: /هذا التمرين غير مريح/ }));

    const backOnPicker = await screen.findByRole('slider');
    expect(Number((backOnPicker as HTMLInputElement).value)).toBe(reported);

    await waitFor(async () => {
      const open = await storage.getOpenAlertSession();
      expect(open?.activationBefore).toBe(reported);
    });
  });
});
