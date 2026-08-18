import { minutesBetween } from '../lib/date';
import type { AlertSession } from '../storage/types';

/**
 * The single follow-up after an alert session.
 *
 * It asks once, on the next app open inside its window, and then never again.
 * There is no notification: scheduled local notifications are unavailable in
 * Safari, and a nagging prompt would be the wrong thing to build even if they
 * were not.
 *
 * Pure: `now` is always a parameter.
 */

export const FOLLOW_UP_MIN_MINUTES = 5;
export const FOLLOW_UP_MAX_MINUTES = 60;

export type FollowUpState = 'not-applicable' | 'too-early' | 'due' | 'expired';

export function followUpState(session: AlertSession, now: Date): FollowUpState {
  if (session.endedAt === null) return 'not-applicable';
  if (session.followUpAnsweredAt !== null) return 'not-applicable';
  if (session.followUpMissed) return 'not-applicable';

  const elapsed = minutesBetween(new Date(session.endedAt), now);
  if (elapsed < FOLLOW_UP_MIN_MINUTES) return 'too-early';
  if (elapsed > FOLLOW_UP_MAX_MINUTES) return 'expired';
  return 'due';
}

/**
 * The one session to ask about now. When several are due, the most recent wins:
 * it is the one the user can actually still remember.
 */
export function pendingFollowUp(sessions: readonly AlertSession[], now: Date): AlertSession | null {
  // `due` implies a non-null endedAt, so the narrowed type removes the need for
  // a fallback that could never be reached.
  const due = sessions.filter(
    (session): session is AlertSession & { endedAt: string } => followUpState(session, now) === 'due',
  );
  if (due.length === 0) return null;
  return due.reduce((latest, session) => (session.endedAt > latest.endedAt ? session : latest));
}

/** Sessions whose window has closed, to be marked missed and never asked about. */
export function expiredFollowUps(sessions: readonly AlertSession[], now: Date): AlertSession[] {
  return sessions.filter((session) => followUpState(session, now) === 'expired');
}

export function markMissed(session: AlertSession): AlertSession {
  return { ...session, followUpMissed: true };
}

/**
 * The other sessions one answer stands in for.
 *
 * Two episodes inside an hour produce two due follow-ups, and asking twice in a
 * row turns a check-in into an interrogation. Answering closes the rest: they
 * leave the return-to-life denominator rather than counting as failures, which
 * is exactly how a window that closed unattended is treated.
 *
 * A session whose window has not opened yet is left alone. It is not covered by
 * this answer, it simply has not been asked about, and closing it here would
 * mean an episode that ended a minute ago never gets its own follow-up.
 */
export function coveredByAnswer(
  sessions: readonly AlertSession[],
  answered: AlertSession,
  now: Date,
): AlertSession[] {
  return sessions.filter((session) => {
    if (session.id === answered.id) return false;
    const state = followUpState(session, now);
    return state === 'due' || state === 'expired';
  });
}

export interface FollowUpAnswer {
  activationAfter: number;
  actionCompleted: AlertSession['actionCompleted'];
  whatHelped: string | null;
}

export function applyFollowUp(session: AlertSession, answer: FollowUpAnswer, now: Date): AlertSession {
  return {
    ...session,
    activationAfter: answer.activationAfter,
    actionCompleted: answer.actionCompleted,
    whatHelped: answer.whatHelped,
    followUpAnsweredAt: now.toISOString(),
    followUpMissed: false,
  };
}

/** Dismissing is not answering: the window stays open until it expires. */
export function dismissFollowUp(session: AlertSession): AlertSession {
  return session;
}
