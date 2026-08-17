import { minutesBetween } from '../lib/date';
import type { SafetyCheck } from '../storage/types';

/**
 * The check-once seal.
 *
 * Repeated checking is the compulsion this app is trying not to feed, so a
 * recent check is surfaced as a reminder. It is only ever a reminder: nothing
 * here decides anything on the user's behalf, and no return value blocks a
 * re-check (spec principle §2.4). The app cannot see the room, so it cannot
 * know whether checking again is warranted.
 *
 * Pure: `now` is always a parameter, never read from the clock.
 */

export interface LockoutState {
  /** True when a reminder should be shown before the safety question. */
  active: boolean;
  /** Whole minutes since the last check, or null when there is none. */
  minutesAgo: number | null;
  lastCheck: SafetyCheck | null;
}

export function minutesSinceCheck(check: SafetyCheck, now: Date): number {
  return minutesBetween(new Date(check.at), now);
}

/**
 * How far ahead of `now` a check may be stamped before it is treated as a bad
 * timestamp rather than a fresh one.
 *
 * `now` arrives here as a value sampled on a tick, so a check recorded moments
 * ago can legitimately carry a later timestamp than the snapshot it is compared
 * against. Rejecting those hid the seal for up to a full tick immediately after
 * the user checked, which is exactly when it needs to be on screen.
 */
export const CLOCK_SKEW_TOLERANCE_MINUTES = 5;

export function lockoutState(lastCheck: SafetyCheck | null, now: Date, windowMinutes: number): LockoutState {
  if (!lastCheck) return { active: false, minutesAgo: null, lastCheck: null };

  const raw = minutesSinceCheck(lastCheck, now);
  // Slightly ahead means "just now". Far ahead means a clock or timezone change,
  // and stays inactive rather than becoming a permanent lockout.
  const elapsed = raw < 0 && raw > -CLOCK_SKEW_TOLERANCE_MINUTES ? 0 : raw;
  const minutesAgo = Math.max(0, Math.floor(elapsed));

  // A zero window means the user turned the reminder off.
  const active = windowMinutes > 0 && elapsed >= 0 && elapsed < windowMinutes;

  return { active, minutesAgo, lastCheck };
}

export function isWithinLockout(lastCheck: SafetyCheck | null, now: Date, windowMinutes: number): boolean {
  return lockoutState(lastCheck, now, windowMinutes).active;
}
