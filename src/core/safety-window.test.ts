import { describe, expect, it } from 'vitest';
import type { SafetyCheck } from '../storage/types';
import { isWithinLockout, lockoutState, minutesSinceCheck } from './safety-window';

const NOW = new Date('2026-08-17T12:00:00.000Z');

function checkAt(iso: string): SafetyCheck {
  return { id: 'c', at: iso, target: 'door', source: 'manual' };
}

describe('minutesSinceCheck', () => {
  it('returns fractional minutes', () => {
    expect(minutesSinceCheck(checkAt('2026-08-17T11:55:30.000Z'), NOW)).toBe(4.5);
  });
});

describe('lockoutState', () => {
  it('is inactive when nothing has been checked yet', () => {
    expect(lockoutState(null, NOW, 15)).toEqual({ active: false, minutesAgo: null, lastCheck: null });
  });

  it('is active for a check inside the window', () => {
    const state = lockoutState(checkAt('2026-08-17T11:56:00.000Z'), NOW, 15);
    expect(state.active).toBe(true);
    expect(state.minutesAgo).toBe(4);
  });

  it('is inactive for a check outside the window', () => {
    expect(lockoutState(checkAt('2026-08-17T11:40:00.000Z'), NOW, 15).active).toBe(false);
  });

  /** Exactly at the boundary the window has elapsed, so the reminder is done. */
  it('treats the boundary as outside the window', () => {
    expect(lockoutState(checkAt('2026-08-17T11:45:00.000Z'), NOW, 15).active).toBe(false);
    expect(lockoutState(checkAt('2026-08-17T11:45:00.001Z'), NOW, 15).active).toBe(true);
  });

  it('is inactive at every window length when the check is old', () => {
    for (const window of [5, 10, 15, 30]) {
      expect(lockoutState(checkAt('2026-08-17T10:00:00.000Z'), NOW, window).active).toBe(false);
    }
  });

  it('is active at every window length for a check one minute ago', () => {
    for (const window of [5, 10, 15, 30]) {
      expect(lockoutState(checkAt('2026-08-17T11:59:00.000Z'), NOW, window).active).toBe(true);
    }
  });

  /** A zero window is how the user turns the reminder off entirely. */
  it('is never active when the window is zero', () => {
    expect(lockoutState(checkAt('2026-08-17T11:59:59.000Z'), NOW, 0).active).toBe(false);
  });

  /**
   * A stored check dated in the future can happen after a clock or timezone
   * change. Treating it as active would lock the reminder on indefinitely.
   */
  it('is inactive when the stored check is in the future', () => {
    const state = lockoutState(checkAt('2026-08-17T13:00:00.000Z'), NOW, 15);
    expect(state.active).toBe(false);
    expect(state.minutesAgo).toBe(0);
  });

  it('still reports how long ago the check was, even when inactive', () => {
    expect(lockoutState(checkAt('2026-08-17T11:00:00.000Z'), NOW, 15).minutesAgo).toBe(60);
  });

  it('floors minutesAgo rather than rounding it up', () => {
    expect(lockoutState(checkAt('2026-08-17T11:58:01.000Z'), NOW, 15).minutesAgo).toBe(1);
  });

  it('carries the check through so the UI can show its target and time', () => {
    const check = checkAt('2026-08-17T11:58:00.000Z');
    expect(lockoutState(check, NOW, 15).lastCheck).toBe(check);
  });

  it('crosses midnight without a discontinuity', () => {
    const midnight = new Date('2026-08-18T00:02:00.000Z');
    expect(lockoutState(checkAt('2026-08-17T23:59:00.000Z'), midnight, 15).active).toBe(true);
  });
});

describe('isWithinLockout', () => {
  it('mirrors lockoutState.active', () => {
    expect(isWithinLockout(checkAt('2026-08-17T11:59:00.000Z'), NOW, 15)).toBe(true);
    expect(isWithinLockout(checkAt('2026-08-17T11:00:00.000Z'), NOW, 15)).toBe(false);
    expect(isWithinLockout(null, NOW, 15)).toBe(false);
  });
});
