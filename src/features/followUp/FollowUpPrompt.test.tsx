import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Providers } from '../../app/Providers';
import { HunaDatabase } from '../../storage/indexeddb/db';
import { IndexedDbStorage } from '../../storage/indexeddb/IndexedDbStorage';
import type { AlertSession } from '../../storage/types';
import { FollowUpPrompt } from './FollowUpPrompt';

let counter = 0;
let storage: IndexedDbStorage;

beforeEach(() => {
  counter += 1;
  storage = new IndexedDbStorage(new HunaDatabase(`huna-followup-${counter}`));
});

/** A session that ended `minutesAgo` minutes back, still unanswered. */
function endedSession(id: string, minutesAgo: number): AlertSession {
  const now = Date.now();
  return {
    id,
    startedAt: new Date(now - (minutesAgo + 3) * 60_000).toISOString(),
    endedAt: new Date(now - minutesAgo * 60_000).toISOString(),
    safetyAnswer: 'no',
    stateId: 'startled',
    activationBefore: 8,
    activationAfter: null,
    chosenAction: 'المشي برفق لدقيقتين',
    actionCompleted: null,
    whatHelped: null,
    followUpMissed: false,
    followUpAnsweredAt: null,
  };
}

function renderPrompt() {
  return render(
    <Providers storage={storage} legacyBlob={null}>
      <FollowUpPrompt />
    </Providers>,
  );
}

describe('FollowUpPrompt', () => {
  it('stays away until the window opens', async () => {
    await storage.saveAlertSession(endedSession('fresh', 1));
    const { container } = renderPrompt();
    await waitFor(() => expect(container.querySelector('.follow-up')).toBeNull());
  });

  it('asks about the session once the window is open', async () => {
    await storage.saveAlertSession(endedSession('due', 20));
    renderPrompt();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  /**
   * Two hard hours produced two prompts back to back. One answer now speaks for
   * the cluster: the others leave the denominator instead of counting as
   * failures, and nothing pops up again the moment the first is answered.
   */
  it('asks once for a cluster of sessions and closes the rest', async () => {
    await storage.saveAlertSession(endedSession('older', 30));
    await storage.saveAlertSession(endedSession('newer', 10));

    renderPrompt();
    await screen.findByRole('dialog');

    await userEvent.click(screen.getByRole('button', { name: 'نعم' }));

    await waitFor(async () => {
      const [older, newer] = await Promise.all([
        storage.getAlertSession('older'),
        storage.getAlertSession('newer'),
      ]);
      expect(newer?.actionCompleted).toBe('yes');
      expect(newer?.followUpAnsweredAt).not.toBeNull();
      expect(older?.followUpMissed).toBe(true);
      expect(older?.actionCompleted).toBeNull();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /** "Not now" is not an answer: nothing is recorded, and it stops asking. */
  it('closes without recording anything when it is put off', async () => {
    await storage.saveAlertSession(endedSession('due', 20));

    renderPrompt();
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: 'ليس الآن' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const session = await storage.getAlertSession('due');
    expect(session?.followUpAnsweredAt).toBeNull();
    expect(session?.followUpMissed).toBe(false);
  });

  /** A window that closed unattended leaves the denominator, quietly. */
  it('marks an expired follow-up missed rather than asking about it', async () => {
    await storage.saveAlertSession(endedSession('stale', 180));

    const { container } = renderPrompt();
    await waitFor(async () => {
      expect((await storage.getAlertSession('stale'))?.followUpMissed).toBe(true);
    });
    expect(container.querySelector('.follow-up')).toBeNull();
  });
});
