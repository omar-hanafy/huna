import { minutesBetween } from '../lib/date';
import type { AlertSession, SafetyCheck } from '../storage/types';

/**
 * Metrics measure recovery, not danger, and never reward time spent in the app.
 *
 * Two rules shape every number here:
 *
 *  - An unanswered follow-up is missing data, not a failure. Counting it against
 *    the user would turn a forgotten prompt into evidence that they are getting
 *    worse.
 *  - A user who honestly answered "nothing right now" did not fail either. That
 *    session leaves the denominator rather than lowering the rate.
 *
 * Pure: `now` is always a parameter.
 */

/** Below this the rate is withheld: a small sample swings wildly and reads as regression. */
export const MIN_SESSIONS_FOR_RATE = 5;

export interface ReturnToLifeStats {
  /** 0 to 1, or null when there is not yet enough data to be meaningful. */
  rate: number | null;
  /** Sessions with an answered follow-up and a chosen action. The denominator. */
  answered: number;
  completed: number;
  partly: number;
  notCompleted: number;
  /** Sessions where the user chose no action. Excluded, never counted as failure. */
  declinedAction: number;
  /** Follow-up window passed without the app being opened. Excluded. */
  missed: number;
}

export function returnToLifeStats(sessions: readonly AlertSession[]): ReturnToLifeStats {
  let completed = 0;
  let partly = 0;
  let notCompleted = 0;
  let declinedAction = 0;
  let missed = 0;

  for (const session of sessions) {
    if (session.followUpMissed) {
      missed += 1;
      continue;
    }
    if (session.followUpAnsweredAt === null) continue;
    if (session.chosenAction === null) {
      declinedAction += 1;
      continue;
    }

    if (session.actionCompleted === 'yes') completed += 1;
    else if (session.actionCompleted === 'partly') partly += 1;
    else if (session.actionCompleted === 'no') notCompleted += 1;
  }

  const answered = completed + partly + notCompleted;
  const rate = answered >= MIN_SESSIONS_FOR_RATE ? completed / answered : null;

  return { rate, answered, completed, partly, notCompleted, declinedAction, missed };
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** How long a session lasted, from start to the user ending it. */
export function sessionMinutes(session: AlertSession): number | null {
  if (session.endedAt === null) return null;
  const minutes = minutesBetween(new Date(session.startedAt), new Date(session.endedAt));
  return minutes >= 0 ? minutes : null;
}

export function medianSessionMinutes(sessions: readonly AlertSession[]): number | null {
  return median(sessions.map(sessionMinutes).filter((value): value is number => value !== null));
}

/**
 * Median drop in self-reported activation across a session. Positive means the
 * activation came down; a negative value is real information, not an error.
 */
export function medianActivationDrop(sessions: readonly AlertSession[]): number | null {
  const drops = sessions
    .filter((s) => s.activationBefore !== null && s.activationAfter !== null)
    .map((s) => s.activationBefore! - s.activationAfter!);
  return median(drops);
}

export function sessionsUnderTwoMinutes(sessions: readonly AlertSession[]): {
  count: number;
  total: number;
} {
  const timed = sessions.map(sessionMinutes).filter((value): value is number => value !== null);
  return { count: timed.filter((minutes) => minutes < 2).length, total: timed.length };
}

/**
 * Checks per day over a window ending at `now`, oldest first. Used to show
 * whether repeated checking is easing, never to set a target.
 */
export function checksPerDay(
  checks: readonly SafetyCheck[],
  now: Date,
  days: number,
): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    buckets.set(toKey(date), 0);
  }

  for (const check of checks) {
    const key = toKey(new Date(check.at));
    const existing = buckets.get(key);
    if (existing !== undefined) buckets.set(key, existing + 1);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Which grounding state the user reaches for most. Descriptive only. */
export function mostUsedState(sessions: readonly AlertSession[]): string | null {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (!session.stateId) continue;
    counts.set(session.stateId, (counts.get(session.stateId) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0];
}
