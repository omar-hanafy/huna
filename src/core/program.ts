import { daysBetween, toDateKey } from '../lib/date';
import type { UserPreferences, WeekNumber } from '../storage/types';

export const PROGRAM_WEEKS = 4;

/**
 * Which week the program suggests today.
 *
 * Weeks are suggested, never enforced. Hard-locking a later week would
 * contradict the app's own agency principle, and someone returning after a gap
 * should not be told they are behind. `activeWeek` lets a manual override win
 * unconditionally.
 */
export function suggestedWeek(programStartedAt: string, now: Date): WeekNumber {
  const started = new Date(programStartedAt);
  if (Number.isNaN(started.getTime())) return 1;

  const elapsed = daysBetween(toDateKey(started), toDateKey(now));
  // A start date in the future means day one has not arrived yet.
  if (elapsed < 0) return 1;

  const week = Math.floor(elapsed / 7) + 1;
  return Math.min(week, PROGRAM_WEEKS) as WeekNumber;
}

export function activeWeek(
  preferences: Pick<UserPreferences, 'programStartedAt' | 'weekOverride'>,
  now: Date,
): WeekNumber {
  return preferences.weekOverride ?? suggestedWeek(preferences.programStartedAt, now);
}

export function isOverridden(preferences: Pick<UserPreferences, 'weekOverride'>): boolean {
  return preferences.weekOverride !== null;
}

/** Day number within the program, 1-based. Used for copy, never for gating. */
export function programDay(programStartedAt: string, now: Date): number {
  const started = new Date(programStartedAt);
  if (Number.isNaN(started.getTime())) return 1;
  const elapsed = daysBetween(toDateKey(started), toDateKey(now));
  return Math.max(1, elapsed + 1);
}
