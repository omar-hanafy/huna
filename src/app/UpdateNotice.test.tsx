import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { pwaStub } from '../test/pwaRegisterStub';
import { Providers } from './Providers';
import { UpdateNotice } from './UpdateNotice';
import { resetUpdateWatcherForTests } from './updateWatcher';

beforeEach(() => {
  pwaStub.reset();
  resetUpdateWatcherForTests();
});

function renderNotice(initialPath = '/') {
  return render(
    <Providers legacyBlob={null}>
      <MemoryRouter initialEntries={[initialPath]}>
        <UpdateNotice />
      </MemoryRouter>
    </Providers>,
  );
}

/** Fires the callback the service worker fires when a new build is waiting. */
function announceUpdate() {
  act(() => {
    pwaStub.options?.onNeedRefresh?.();
  });
}

describe('UpdateNotice', () => {
  it('registers the service worker even before any update exists', () => {
    const { container } = renderNotice();
    expect(pwaStub.registered).toBe(1);
    expect(container.querySelector('.update-notice')).toBeNull();
  });

  it('offers the update when one is waiting', async () => {
    renderNotice();
    announceUpdate();
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حدّث الآن' })).toBeInTheDocument();
  });

  it('applies the update on request', async () => {
    renderNotice();
    announceUpdate();
    await userEvent.click(await screen.findByRole('button', { name: 'حدّث الآن' }));
    expect(pwaStub.updates).toEqual([true]);
  });

  /**
   * The update must be declinable. A build that reloads someone mid-episode is
   * a worse outcome than one that arrives a day late.
   */
  it('can be dismissed, leaving the running version in place', async () => {
    renderNotice();
    announceUpdate();
    await userEvent.click(await screen.findByRole('button', { name: 'ليس الآن' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(pwaStub.updates).toEqual([]);
  });

  /** Nobody mid-episode should be asked to make a software decision. */
  it('stays silent during an alert', async () => {
    const { container } = renderNotice('/alert/state');
    announceUpdate();
    await Promise.resolve();
    expect(container.querySelector('.update-notice')).toBeNull();
  });
});
