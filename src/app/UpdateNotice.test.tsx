import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pwaStub } from '../test/pwaRegisterStub';
import { Providers } from './Providers';
import { UpdateNotice } from './UpdateNotice';

beforeEach(() => {
  pwaStub.needRefresh = false;
  pwaStub.updateServiceWorker = () => Promise.resolve();
});

function renderNotice() {
  return render(
    <Providers legacyBlob={null}>
      <UpdateNotice />
    </Providers>,
  );
}

describe('UpdateNotice', () => {
  it('renders nothing when there is no update waiting', () => {
    const { container } = renderNotice();
    expect(container.querySelector('.update-notice')).toBeNull();
  });

  it('offers the update when one is waiting', () => {
    pwaStub.needRefresh = true;
    renderNotice();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حدّث الآن' })).toBeInTheDocument();
  });

  it('applies the update on request', async () => {
    pwaStub.needRefresh = true;
    const update = vi.fn(() => Promise.resolve());
    pwaStub.updateServiceWorker = update;

    renderNotice();
    await userEvent.click(screen.getByRole('button', { name: 'حدّث الآن' }));
    expect(update).toHaveBeenCalledWith(true);
  });

  /**
   * The update must be declinable. A build that reloads someone mid-episode is
   * a worse outcome than one that arrives a day late.
   */
  it('can be dismissed, leaving the running version in place', async () => {
    pwaStub.needRefresh = true;
    const update = vi.fn(() => Promise.resolve());
    pwaStub.updateServiceWorker = update;

    renderNotice();
    await userEvent.click(screen.getByRole('button', { name: 'ليس الآن' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });
});
