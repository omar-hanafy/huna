import { describe, expect, it } from 'vitest';
import type { AlertSession, SafetyCheck } from '../storage/types';
import {
  MIN_SESSIONS_FOR_RATE,
  checksPerDay,
  median,
  medianActivationDrop,
  medianSessionMinutes,
  mostUsedState,
  returnToLifeStats,
  sessionMinutes,
  sessionsUnderTwoMinutes,
} from './recovery-metrics';

let seq = 0;
function session(overrides: Partial<AlertSession> = {}): AlertSession {
  seq += 1;
  return {
    id: `s${seq}`,
    startedAt: '2026-08-17T09:00:00.000Z',
    endedAt: '2026-08-17T09:01:30.000Z',
    safetyAnswer: 'no',
    stateId: 'scanning',
    activationBefore: 8,
    activationAfter: 5,
    chosenAction: 'walk',
    actionCompleted: 'yes',
    whatHelped: null,
    followUpMissed: false,
    followUpAnsweredAt: '2026-08-17T09:10:00.000Z',
    ...overrides,
  };
}

function answered(count: number, completed: AlertSession['actionCompleted']): AlertSession[] {
  return Array.from({ length: count }, () => session({ actionCompleted: completed }));
}

describe('returnToLifeStats', () => {
  it('returns a null rate for an empty set', () => {
    const stats = returnToLifeStats([]);
    expect(stats.rate).toBeNull();
    expect(stats.answered).toBe(0);
  });

  it('withholds the rate below the minimum sample', () => {
    const stats = returnToLifeStats(answered(MIN_SESSIONS_FOR_RATE - 1, 'yes'));
    expect(stats.rate).toBeNull();
    expect(stats.answered).toBe(MIN_SESSIONS_FOR_RATE - 1);
    expect(stats.completed).toBe(MIN_SESSIONS_FOR_RATE - 1);
  });

  it('reports the rate once the sample is large enough', () => {
    const stats = returnToLifeStats(answered(MIN_SESSIONS_FOR_RATE, 'yes'));
    expect(stats.rate).toBe(1);
  });

  it('counts only full completion toward the rate, reporting partial separately', () => {
    const sessions = [...answered(3, 'yes'), ...answered(1, 'partly'), ...answered(1, 'no')];
    const stats = returnToLifeStats(sessions);
    expect(stats.answered).toBe(5);
    expect(stats.completed).toBe(3);
    expect(stats.partly).toBe(1);
    expect(stats.notCompleted).toBe(1);
    expect(stats.rate).toBeCloseTo(0.6);
  });

  /**
   * A forgotten prompt is missing data. Counting it as failure would turn the
   * user's ordinary life into evidence of regression.
   */
  it('excludes missed follow-ups from the denominator instead of failing them', () => {
    const sessions = [
      ...answered(5, 'yes'),
      ...Array.from({ length: 10 }, () => session({ followUpMissed: true })),
    ];
    const stats = returnToLifeStats(sessions);
    expect(stats.missed).toBe(10);
    expect(stats.answered).toBe(5);
    expect(stats.rate).toBe(1);
  });

  it('excludes sessions with an unanswered follow-up that has not yet expired', () => {
    const sessions = [...answered(5, 'yes'), session({ followUpAnsweredAt: null, followUpMissed: false })];
    expect(returnToLifeStats(sessions).answered).toBe(5);
  });

  /** Choosing "nothing right now" is an honest answer, not a failure. */
  it('excludes sessions where no action was chosen', () => {
    const sessions = [
      ...answered(5, 'yes'),
      ...Array.from({ length: 3 }, () => session({ chosenAction: null, actionCompleted: null })),
    ];
    const stats = returnToLifeStats(sessions);
    expect(stats.declinedAction).toBe(3);
    expect(stats.answered).toBe(5);
    expect(stats.rate).toBe(1);
  });

  it('reports a rate of zero when nothing was completed', () => {
    expect(returnToLifeStats(answered(5, 'no')).rate).toBe(0);
  });

  /**
   * Defensive: a record answered but carrying no completion value is malformed.
   * It must not be silently counted as either a success or a failure.
   */
  it('ignores an answered session whose completion value is missing', () => {
    const sessions = [...answered(5, 'yes'), session({ actionCompleted: null })];
    const stats = returnToLifeStats(sessions);
    expect(stats.answered).toBe(5);
    expect(stats.rate).toBe(1);
  });
});

describe('median', () => {
  it('returns null for an empty list', () => {
    expect(median([])).toBeNull();
  });

  it('handles odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('handles a single value', () => {
    expect(median([7])).toBe(7);
  });

  it('does not mutate its input', () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe('sessionMinutes', () => {
  it('measures from start to end', () => {
    expect(sessionMinutes(session())).toBe(1.5);
  });

  it('returns null for a session that has not ended', () => {
    expect(sessionMinutes(session({ endedAt: null }))).toBeNull();
  });

  /** A clock change can produce an end before the start; that is not a duration. */
  it('returns null when the end precedes the start', () => {
    expect(sessionMinutes(session({ endedAt: '2026-08-17T08:00:00.000Z' }))).toBeNull();
  });
});

describe('medianSessionMinutes', () => {
  it('ignores unfinished sessions', () => {
    const sessions = [
      session({ endedAt: '2026-08-17T09:01:00.000Z' }),
      session({ endedAt: '2026-08-17T09:03:00.000Z' }),
      session({ endedAt: null }),
    ];
    expect(medianSessionMinutes(sessions)).toBe(2);
  });

  it('returns null when nothing has finished', () => {
    expect(medianSessionMinutes([session({ endedAt: null })])).toBeNull();
  });
});

describe('medianActivationDrop', () => {
  it('computes the median drop', () => {
    const sessions = [
      session({ activationBefore: 8, activationAfter: 5 }),
      session({ activationBefore: 9, activationAfter: 4 }),
      session({ activationBefore: 7, activationAfter: 6 }),
    ];
    expect(medianActivationDrop(sessions)).toBe(3);
  });

  /** A rise is real information, not an error to be clamped away. */
  it('reports a negative drop when activation rose', () => {
    expect(medianActivationDrop([session({ activationBefore: 4, activationAfter: 7 })])).toBe(-3);
  });

  it('ignores sessions missing either reading', () => {
    const sessions = [
      session({ activationAfter: null }),
      session({ activationBefore: 8, activationAfter: 5 }),
    ];
    expect(medianActivationDrop(sessions)).toBe(3);
  });

  it('returns null when nothing is measurable', () => {
    expect(medianActivationDrop([session({ activationBefore: null, activationAfter: null })])).toBeNull();
  });
});

describe('sessionsUnderTwoMinutes', () => {
  it('counts short sessions against those that were timed', () => {
    const sessions = [
      session({ endedAt: '2026-08-17T09:01:00.000Z' }),
      session({ endedAt: '2026-08-17T09:05:00.000Z' }),
      session({ endedAt: null }),
    ];
    expect(sessionsUnderTwoMinutes(sessions)).toEqual({ count: 1, total: 2 });
  });

  it('treats exactly two minutes as not under two minutes', () => {
    expect(sessionsUnderTwoMinutes([session({ endedAt: '2026-08-17T09:02:00.000Z' })]).count).toBe(0);
  });

  it('handles an empty set', () => {
    expect(sessionsUnderTwoMinutes([])).toEqual({ count: 0, total: 0 });
  });
});

describe('checksPerDay', () => {
  const check = (at: string): SafetyCheck => ({ id: at, at, target: 'door', source: 'manual' });

  it('returns one bucket per day, oldest first, including empty days', () => {
    const now = new Date(2026, 7, 17, 12, 0, 0);
    const result = checksPerDay([], now, 3);
    expect(result.map((r) => r.date)).toEqual(['2026-08-15', '2026-08-16', '2026-08-17']);
    expect(result.every((r) => r.count === 0)).toBe(true);
  });

  it('counts checks into their local day', () => {
    const now = new Date(2026, 7, 17, 12, 0, 0);
    const checks = [
      check(new Date(2026, 7, 17, 9, 0).toISOString()),
      check(new Date(2026, 7, 17, 11, 0).toISOString()),
      check(new Date(2026, 7, 16, 22, 0).toISOString()),
    ];
    const result = checksPerDay(checks, now, 3);
    expect(result.find((r) => r.date === '2026-08-17')?.count).toBe(2);
    expect(result.find((r) => r.date === '2026-08-16')?.count).toBe(1);
  });

  it('ignores checks outside the window', () => {
    const now = new Date(2026, 7, 17, 12, 0, 0);
    const checks = [check(new Date(2026, 6, 1, 9, 0).toISOString())];
    expect(checksPerDay(checks, now, 3).every((r) => r.count === 0)).toBe(true);
  });
});

describe('mostUsedState', () => {
  it('returns null when there is nothing to count', () => {
    expect(mostUsedState([])).toBeNull();
    expect(mostUsedState([session({ stateId: null })])).toBeNull();
  });

  it('returns the most frequent state', () => {
    const sessions = [
      session({ stateId: 'scanning' }),
      session({ stateId: 'scanning' }),
      session({ stateId: 'startled' }),
    ];
    expect(mostUsedState(sessions)).toBe('scanning');
  });

  it('breaks ties deterministically', () => {
    const sessions = [session({ stateId: 'startled' }), session({ stateId: 'activated' })];
    expect(mostUsedState(sessions)).toBe('activated');
  });
});
