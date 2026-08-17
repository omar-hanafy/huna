import { describe, expect, it } from 'vitest';
import type { AlertSession } from '../storage/types';
import {
  FOLLOW_UP_MAX_MINUTES,
  FOLLOW_UP_MIN_MINUTES,
  applyFollowUp,
  dismissFollowUp,
  expiredFollowUps,
  followUpState,
  markMissed,
  pendingFollowUp,
} from './follow-up';

const ENDED = '2026-08-17T09:00:00.000Z';
const minutesAfterEnd = (minutes: number) => new Date(Date.parse(ENDED) + minutes * 60_000);

let seq = 0;
function session(overrides: Partial<AlertSession> = {}): AlertSession {
  seq += 1;
  return {
    id: `s${seq}`,
    startedAt: '2026-08-17T08:58:00.000Z',
    endedAt: ENDED,
    safetyAnswer: 'no',
    stateId: 'scanning',
    activationBefore: 8,
    activationAfter: null,
    chosenAction: 'walk',
    actionCompleted: null,
    whatHelped: null,
    followUpMissed: false,
    followUpAnsweredAt: null,
    ...overrides,
  };
}

describe('followUpState', () => {
  it('is too early before the window opens', () => {
    expect(followUpState(session(), minutesAfterEnd(0))).toBe('too-early');
    expect(followUpState(session(), minutesAfterEnd(FOLLOW_UP_MIN_MINUTES - 0.1))).toBe('too-early');
  });

  it('is due from the opening boundary onward', () => {
    expect(followUpState(session(), minutesAfterEnd(FOLLOW_UP_MIN_MINUTES))).toBe('due');
    expect(followUpState(session(), minutesAfterEnd(30))).toBe('due');
    expect(followUpState(session(), minutesAfterEnd(FOLLOW_UP_MAX_MINUTES))).toBe('due');
  });

  it('expires past the closing boundary', () => {
    expect(followUpState(session(), minutesAfterEnd(FOLLOW_UP_MAX_MINUTES + 0.1))).toBe('expired');
    expect(followUpState(session(), minutesAfterEnd(600))).toBe('expired');
  });

  it('does not apply to a session that has not ended', () => {
    expect(followUpState(session({ endedAt: null }), minutesAfterEnd(30))).toBe('not-applicable');
  });

  /** Asking twice is exactly the nagging this design rules out. */
  it('does not apply once answered', () => {
    const answered = session({ followUpAnsweredAt: '2026-08-17T09:10:00.000Z' });
    expect(followUpState(answered, minutesAfterEnd(30))).toBe('not-applicable');
  });

  it('does not apply once marked missed', () => {
    expect(followUpState(session({ followUpMissed: true }), minutesAfterEnd(30))).toBe('not-applicable');
  });
});

describe('pendingFollowUp', () => {
  it('returns null when nothing is due', () => {
    expect(pendingFollowUp([], minutesAfterEnd(30))).toBeNull();
    expect(pendingFollowUp([session()], minutesAfterEnd(1))).toBeNull();
  });

  it('returns the due session', () => {
    expect(pendingFollowUp([session({ id: 'x' })], minutesAfterEnd(10))?.id).toBe('x');
  });

  /** The most recent one is the one the user can still remember. */
  it('prefers the most recently ended session when several are due', () => {
    const older = session({ id: 'older', endedAt: '2026-08-17T09:00:00.000Z' });
    const newer = session({ id: 'newer', endedAt: '2026-08-17T09:20:00.000Z' });
    const now = new Date('2026-08-17T09:30:00.000Z');
    expect(pendingFollowUp([older, newer], now)?.id).toBe('newer');
  });

  it('picks the same session regardless of array order', () => {
    const older = session({ id: 'older', endedAt: '2026-08-17T09:00:00.000Z' });
    const newer = session({ id: 'newer', endedAt: '2026-08-17T09:20:00.000Z' });
    const now = new Date('2026-08-17T09:30:00.000Z');
    expect(pendingFollowUp([newer, older], now)?.id).toBe('newer');
  });

  it('skips answered and missed sessions', () => {
    const sessions = [
      session({ id: 'answered', followUpAnsweredAt: '2026-08-17T09:06:00.000Z' }),
      session({ id: 'missed', followUpMissed: true }),
    ];
    expect(pendingFollowUp(sessions, minutesAfterEnd(30))).toBeNull();
  });
});

describe('expiredFollowUps', () => {
  it('returns only sessions past the window', () => {
    const sessions = [
      session({ id: 'due' }),
      session({ id: 'expired', endedAt: '2026-08-17T07:00:00.000Z' }),
    ];
    const expired = expiredFollowUps(sessions, minutesAfterEnd(10));
    expect(expired.map((s) => s.id)).toEqual(['expired']);
  });

  it('returns nothing when all are still open', () => {
    expect(expiredFollowUps([session()], minutesAfterEnd(10))).toEqual([]);
  });
});

describe('markMissed', () => {
  it('sets the flag without mutating the original', () => {
    const original = session();
    const marked = markMissed(original);
    expect(marked.followUpMissed).toBe(true);
    expect(original.followUpMissed).toBe(false);
  });
});

describe('applyFollowUp', () => {
  it('records the answer and stamps the time', () => {
    const now = new Date('2026-08-17T09:12:00.000Z');
    const updated = applyFollowUp(
      session(),
      { activationAfter: 4, actionCompleted: 'yes', whatHelped: 'المشي' },
      now,
    );

    expect(updated.activationAfter).toBe(4);
    expect(updated.actionCompleted).toBe('yes');
    expect(updated.whatHelped).toBe('المشي');
    expect(updated.followUpAnsweredAt).toBe(now.toISOString());
    expect(updated.followUpMissed).toBe(false);
  });

  it('clears a previously missed flag if the user answers late', () => {
    const updated = applyFollowUp(
      session({ followUpMissed: true }),
      { activationAfter: 6, actionCompleted: 'no', whatHelped: null },
      new Date('2026-08-17T09:12:00.000Z'),
    );
    expect(updated.followUpMissed).toBe(false);
  });

  it('does not mutate the original session', () => {
    const original = session();
    applyFollowUp(original, { activationAfter: 3, actionCompleted: 'yes', whatHelped: null }, new Date());
    expect(original.activationAfter).toBeNull();
  });
});

describe('dismissFollowUp', () => {
  /** "Not now" is not an answer: the window stays open until it expires. */
  it('leaves the session unchanged so it can still be answered later', () => {
    const original = session();
    const dismissed = dismissFollowUp(original);
    expect(dismissed.followUpAnsweredAt).toBeNull();
    expect(dismissed.followUpMissed).toBe(false);
    expect(followUpState(dismissed, minutesAfterEnd(20))).toBe('due');
  });
});
