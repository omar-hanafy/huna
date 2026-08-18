import { describe, expect, it } from 'vitest';
import type { AlertSession } from '../storage/types';
import {
  RESUME_WINDOW_HOURS,
  alertFlowReducer,
  isResumable,
  isTerminal,
  resumeFrom,
  routeForStep,
  startAlertFlow,
  stepForRoute,
  toSession,
  type AlertEvent,
  type AlertFlowState,
} from './alert-flow';

const START = { sessionId: 'abc', startedAt: '2026-08-17T09:00:00.000Z', lockoutActive: false };

function run(state: AlertFlowState, ...events: AlertEvent[]): AlertFlowState {
  return events.reduce(alertFlowReducer, state);
}

function fresh(lockoutActive = false) {
  return startAlertFlow({ ...START, lockoutActive });
}

describe('startAlertFlow', () => {
  it('opens on the safety question when no check is recent', () => {
    const state = fresh();
    expect(state.step).toBe('safety');
    expect(state.sealVariant).toBeNull();
    expect(state.safetyAnswer).toBeNull();
  });

  it('opens on the seal when a check was recorded inside the window', () => {
    const state = fresh(true);
    expect(state.step).toBe('seal');
    expect(state.sealVariant).toBe('re-entry');
  });

  it('carries the session identity through', () => {
    expect(fresh().sessionId).toBe('abc');
    expect(fresh().startedAt).toBe('2026-08-17T09:00:00.000Z');
  });
});

describe('the safety question', () => {
  /** The single most important branch in the product. */
  it('sends "yes" to safety mode', () => {
    const state = run(fresh(), { type: 'ANSWER_SAFETY', answer: 'yes' });
    expect(state.step).toBe('danger');
    expect(state.safetyAnswer).toBe('yes');
  });

  /**
   * The app cannot resolve the user's uncertainty, so it must not guess.
   * "Unsure" is treated exactly like "yes".
   */
  it('sends "unsure" to safety mode, exactly like "yes"', () => {
    const state = run(fresh(), { type: 'ANSWER_SAFETY', answer: 'unsure' });
    expect(state.step).toBe('danger');
  });

  it('continues to the seal only on an explicit "no"', () => {
    const state = run(fresh(), { type: 'ANSWER_SAFETY', answer: 'no' });
    expect(state.step).toBe('seal');
    expect(state.sealVariant).toBe('fresh');
  });

  it('lets the user leave safety mode and continue grounding', () => {
    const state = run(fresh(), { type: 'ANSWER_SAFETY', answer: 'yes' }, { type: 'DANGER_RESOLVED' });
    expect(state.step).toBe('state');
  });
});

describe('the seal', () => {
  it('continues to the state question when nothing changed', () => {
    const state = run(fresh(true), { type: 'SEAL_CONTINUE' });
    expect(state.step).toBe('state');
    expect(state.sealVariant).toBeNull();
  });

  /** Principle: the app never blocks a re-check. */
  it('always offers a way back to the question', () => {
    const state = run(fresh(true), { type: 'SEAL_RECHECK' });
    expect(state.step).toBe('safety');
  });

  it('clears any earlier answer when the user says the situation changed', () => {
    const state = run(fresh(), { type: 'ANSWER_SAFETY', answer: 'no' }, { type: 'SEAL_RECHECK' });
    expect(state.safetyAnswer).toBeNull();
    expect(state.step).toBe('safety');
  });

  it('leads somewhere from both of its choices, never to a dead end', () => {
    for (const event of [{ type: 'SEAL_CONTINUE' } as const, { type: 'SEAL_RECHECK' } as const]) {
      expect(run(fresh(true), event).step).not.toBe('seal');
    }
  });
});

describe('activation before', () => {
  it('records the reading', () => {
    expect(run(fresh(), { type: 'SET_ACTIVATION_BEFORE', value: 7 }).activationBefore).toBe(7);
  });

  it('clamps out-of-range readings', () => {
    expect(run(fresh(), { type: 'SET_ACTIVATION_BEFORE', value: 42 }).activationBefore).toBe(10);
    expect(run(fresh(), { type: 'SET_ACTIVATION_BEFORE', value: -3 }).activationBefore).toBe(0);
    expect(run(fresh(), { type: 'SET_ACTIVATION_BEFORE', value: 4.6 }).activationBefore).toBe(5);
  });
});

describe('the sequence', () => {
  const atSequence = () =>
    run(
      fresh(),
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'SEAL_CONTINUE' },
      { type: 'CHOOSE_STATE', stateId: 'scanning' },
    );

  it('starts at the first step', () => {
    const state = atSequence();
    expect(state.step).toBe('sequence');
    expect(state.stepIndex).toBe(0);
    expect(state.stateId).toBe('scanning');
  });

  it('advances through the steps', () => {
    const state = run(atSequence(), { type: 'NEXT_SEQUENCE_STEP', stepCount: 5 });
    expect(state.stepIndex).toBe(1);
    expect(state.step).toBe('sequence');
  });

  it('moves to the action screen after the last step', () => {
    let state = atSequence();
    for (let index = 0; index < 5; index += 1) {
      state = alertFlowReducer(state, { type: 'NEXT_SEQUENCE_STEP', stepCount: 5 });
    }
    expect(state.step).toBe('action');
  });

  it('can step backwards without going below the first step', () => {
    let state = run(atSequence(), { type: 'NEXT_SEQUENCE_STEP', stepCount: 5 });
    state = alertFlowReducer(state, { type: 'PREVIOUS_SEQUENCE_STEP' });
    expect(state.stepIndex).toBe(0);
    state = alertFlowReducer(state, { type: 'PREVIOUS_SEQUENCE_STEP' });
    expect(state.stepIndex).toBe(0);
  });

  /** "This isn't helping" must always be available mid-sequence. */
  it('can be left early for the action screen', () => {
    expect(run(atSequence(), { type: 'FINISH_SEQUENCE' }).step).toBe('action');
  });

  it('changing state resets the step index', () => {
    const state = run(
      atSequence(),
      { type: 'NEXT_SEQUENCE_STEP', stepCount: 5 },
      { type: 'NEXT_SEQUENCE_STEP', stepCount: 5 },
      { type: 'CHOOSE_STATE', stateId: 'detached' },
    );
    expect(state.stepIndex).toBe(0);
    expect(state.stateId).toBe('detached');
  });
});

describe('choosing an action', () => {
  const atAction = () =>
    run(
      fresh(),
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'SEAL_CONTINUE' },
      { type: 'CHOOSE_STATE', stateId: 'scanning' },
      { type: 'FINISH_SEQUENCE' },
    );

  it('records the action and finishes', () => {
    const state = run(atAction(), { type: 'CHOOSE_ACTION', action: 'امشِ برفق لدقيقتين' });
    expect(state.chosenAction).toBe('امشِ برفق لدقيقتين');
    expect(state.actionChosen).toBe(true);
    expect(state.step).toBe('done');
    expect(isTerminal(state)).toBe(true);
  });

  /** "Nothing right now" is a valid answer, not a refusal to answer. */
  it('accepts choosing no action at all', () => {
    const state = run(atAction(), { type: 'CHOOSE_ACTION', action: null });
    expect(state.chosenAction).toBeNull();
    expect(state.actionChosen).toBe(true);
    expect(state.step).toBe('done');
  });
});

describe('going back', () => {
  it('steps back within the sequence before leaving it', () => {
    const state = run(
      fresh(),
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'SEAL_CONTINUE' },
      { type: 'CHOOSE_STATE', stateId: 'scanning' },
      { type: 'NEXT_SEQUENCE_STEP', stepCount: 5 },
      { type: 'BACK' },
    );
    expect(state.step).toBe('sequence');
    expect(state.stepIndex).toBe(0);
  });

  it('leaves the sequence for the state question from the first step', () => {
    const state = run(
      fresh(),
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'SEAL_CONTINUE' },
      { type: 'CHOOSE_STATE', stateId: 'scanning' },
      { type: 'BACK' },
    );
    expect(state.step).toBe('state');
  });

  it('returns from safety mode to the question and clears the stale answer', () => {
    const state = run(fresh(), { type: 'ANSWER_SAFETY', answer: 'yes' }, { type: 'BACK' });
    expect(state.step).toBe('safety');
    expect(state.safetyAnswer).toBeNull();
  });

  it('does nothing at the start or the end', () => {
    expect(run(fresh(), { type: 'BACK' }).step).toBe('safety');
    const done = run(
      fresh(),
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'SEAL_CONTINUE' },
      { type: 'CHOOSE_STATE', stateId: 'scanning' },
      { type: 'FINISH_SEQUENCE' },
      { type: 'CHOOSE_ACTION', action: 'x' },
      { type: 'BACK' },
    );
    expect(done.step).toBe('done');
  });
});

describe('routes', () => {
  it('maps every step to a unique route and back', () => {
    const steps = ['safety', 'danger', 'seal', 'state', 'sequence', 'action', 'done'] as const;
    const routes = steps.map(routeForStep);
    expect(new Set(routes).size).toBe(steps.length);
    for (const step of steps) {
      expect(stepForRoute(routeForStep(step))).toBe(step);
    }
  });

  it('returns null for a route that is not part of the flow', () => {
    expect(stepForRoute('/settings')).toBeNull();
  });
});

describe('resumeFrom', () => {
  const base: AlertSession = {
    id: 'abc',
    startedAt: '2026-08-17T09:00:00.000Z',
    endedAt: null,
    safetyAnswer: null,
    stateId: null,
    activationBefore: null,
    activationAfter: null,
    chosenAction: null,
    actionCompleted: null,
    whatHelped: null,
    followUpMissed: false,
    followUpAnsweredAt: null,
  };

  /** A refresh mid-episode must not throw the user back to the beginning. */
  it('resumes at the safety question when nothing was answered', () => {
    expect(resumeFrom(base).step).toBe('safety');
  });

  it('resumes in safety mode after "yes" or "unsure"', () => {
    expect(resumeFrom({ ...base, safetyAnswer: 'yes' }).step).toBe('danger');
    expect(resumeFrom({ ...base, safetyAnswer: 'unsure' }).step).toBe('danger');
  });

  it('resumes at the state question after "no"', () => {
    expect(resumeFrom({ ...base, safetyAnswer: 'no' }).step).toBe('state');
  });

  it('resumes at the sequence once a state was chosen', () => {
    const state = resumeFrom({ ...base, safetyAnswer: 'no', stateId: 'startled' });
    expect(state.step).toBe('sequence');
    expect(state.stateId).toBe('startled');
  });

  it('resumes at the action screen once an action exists', () => {
    const state = resumeFrom({
      ...base,
      safetyAnswer: 'no',
      stateId: 'startled',
      chosenAction: 'walk',
    });
    expect(state.step).toBe('action');
  });

  it('preserves the recorded activation', () => {
    expect(resumeFrom({ ...base, activationBefore: 7 }).activationBefore).toBe(7);
  });

  /**
   * The bug this pins: someone answered "not sure", read the safety screen,
   * pressed "I'm safe now", started an exercise, and reloaded. The old ordering
   * checked the safety answer before the chosen state and dropped them back on
   * the red danger screen, mid-episode, with their place in the sequence lost.
   */
  it('resumes at the sequence even when the safety answer was not "no"', () => {
    const state = resumeFrom({ ...base, safetyAnswer: 'unsure', stateId: 'startled', stepIndex: 2 });
    expect(state.step).toBe('sequence');
    expect(state.stepIndex).toBe(2);
  });

  it('resumes at the step the user was on', () => {
    expect(resumeFrom({ ...base, safetyAnswer: 'no', stateId: 'startled', stepIndex: 3 }).stepIndex).toBe(3);
  });

  /** Sessions written before the step was recorded resume at the beginning. */
  it('starts the sequence over when the record predates step tracking', () => {
    expect(resumeFrom({ ...base, safetyAnswer: 'no', stateId: 'startled' }).stepIndex).toBe(0);
  });

  /**
   * The recorded screen is the truth. After "try a different exercise" the
   * chosen state is cleared again, so deriving from the safety answer alone
   * would drop someone who answered "not sure" back onto the danger screen
   * they had already left behind.
   */
  it('resumes on the recorded screen rather than re-deriving one', () => {
    const afterChangingExercise = { ...base, safetyAnswer: 'unsure' as const, step: 'state' as const };
    expect(resumeFrom(afterChangingExercise).step).toBe('state');
  });

  it('resumes on the action screen when that is where the user was', () => {
    expect(resumeFrom({ ...base, safetyAnswer: 'no', stateId: 'startled', step: 'action' }).step).toBe(
      'action',
    );
  });

  /** A recorded sequence with no state to run is not a screen that can render. */
  it('ignores a recorded sequence step with no chosen state', () => {
    const impossible = { ...base, safetyAnswer: 'no' as const, step: 'sequence' as const };
    expect(resumeFrom(impossible).step).toBe('state');
  });

  describe('with a recent check', () => {
    /**
     * Leaving and coming back to check again is the compulsion the seal exists
     * for, so the reminder is re-surfaced rather than skipped over.
     */
    it('re-surfaces the seal before grounding has started', () => {
      for (const session of [base, { ...base, safetyAnswer: 'no' as const }]) {
        const state = resumeFrom(session, true);
        expect(state.step).toBe('seal');
        expect(state.sealVariant).toBe('re-entry');
      }
    });

    /** Interrupting an exercise to repeat a reminder would be its own harm. */
    it('does not interrupt a sequence already under way', () => {
      const mid = { ...base, safetyAnswer: 'no' as const, stateId: 'startled' as const };
      expect(resumeFrom(mid, true).step).toBe('sequence');
    });

    it('does not pull the user out of safety mode', () => {
      expect(resumeFrom({ ...base, safetyAnswer: 'yes' }, true).step).toBe('danger');
    });

    it('leaves resume unchanged when no check is recent', () => {
      expect(resumeFrom({ ...base, safetyAnswer: 'no' }, false).step).toBe('state');
    });
  });
});

describe('toSession', () => {
  const base: AlertSession = {
    id: 'old',
    startedAt: '2000-01-01T00:00:00.000Z',
    endedAt: null,
    safetyAnswer: null,
    stateId: null,
    activationBefore: null,
    activationAfter: null,
    chosenAction: null,
    actionCompleted: null,
    whatHelped: null,
    followUpMissed: false,
    followUpAnsweredAt: null,
  };

  it('projects flow state onto the persisted record', () => {
    const state = run(
      fresh(),
      { type: 'SET_ACTIVATION_BEFORE', value: 8 },
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'SEAL_CONTINUE' },
      { type: 'CHOOSE_STATE', stateId: 'predicting' },
      { type: 'FINISH_SEQUENCE' },
      { type: 'CHOOSE_ACTION', action: 'اشرب ماء' },
    );

    const session = toSession(state, base);
    expect(session.id).toBe('abc');
    expect(session.startedAt).toBe('2026-08-17T09:00:00.000Z');
    expect(session.safetyAnswer).toBe('no');
    expect(session.stateId).toBe('predicting');
    expect(session.activationBefore).toBe(8);
    expect(session.chosenAction).toBe('اشرب ماء');
  });

  it('leaves fields the flow does not own untouched', () => {
    const session = toSession(fresh(), { ...base, followUpMissed: true, whatHelped: 'x' });
    expect(session.followUpMissed).toBe(true);
    expect(session.whatHelped).toBe('x');
  });

  it('round-trips through resumeFrom', () => {
    const state = run(
      fresh(),
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'SEAL_CONTINUE' },
      { type: 'CHOOSE_STATE', stateId: 'sleepless' },
    );
    const resumed = resumeFrom(toSession(state, base));
    expect(resumed.step).toBe('sequence');
    expect(resumed.stateId).toBe('sleepless');
    expect(resumed.sessionId).toBe(state.sessionId);
  });
});

describe('changing the exercise', () => {
  /**
   * "This one isn't comfortable" used to re-choose the generic sequence, which
   * from inside that very sequence changed nothing at all: a dead button at the
   * worst possible moment.
   */
  it('returns to the state picker instead of a fixed sequence', () => {
    const state = run(
      fresh(),
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'SEAL_CONTINUE' },
      { type: 'CHOOSE_STATE', stateId: 'unsure' },
      { type: 'NEXT_SEQUENCE_STEP', stepCount: 5 },
      { type: 'CHANGE_EXERCISE' },
    );
    expect(state.step).toBe('state');
    expect(state.stateId).toBeNull();
    expect(state.stepIndex).toBe(0);
  });

  /** Clearing the state is what keeps a reload honest about where the user is. */
  it('resumes at the picker after a reload', () => {
    const state = run(
      fresh(),
      { type: 'ANSWER_SAFETY', answer: 'no' },
      { type: 'CHOOSE_STATE', stateId: 'unsure' },
      { type: 'CHANGE_EXERCISE' },
    );
    const session: AlertSession = {
      id: state.sessionId,
      startedAt: state.startedAt,
      endedAt: null,
      safetyAnswer: state.safetyAnswer,
      stateId: state.stateId,
      stepIndex: state.stepIndex,
      activationBefore: null,
      activationAfter: null,
      chosenAction: null,
      actionCompleted: null,
      whatHelped: null,
      followUpMissed: false,
      followUpAnsweredAt: null,
    };
    expect(resumeFrom(session).step).toBe('state');
  });
});

describe('isResumable', () => {
  const open: AlertSession = {
    id: 'abc',
    startedAt: '2026-08-17T09:00:00.000Z',
    endedAt: null,
    safetyAnswer: 'no',
    stateId: 'startled',
    activationBefore: null,
    activationAfter: null,
    chosenAction: null,
    actionCompleted: null,
    whatHelped: null,
    followUpMissed: false,
    followUpAnsweredAt: null,
  };

  it('resumes a session from minutes ago', () => {
    expect(isResumable(open, new Date('2026-08-17T09:20:00.000Z'))).toBe(true);
  });

  it('resumes right up to the edge of the window', () => {
    const justInside = new Date('2026-08-17T09:00:00.000Z');
    justInside.setHours(justInside.getHours() + RESUME_WINDOW_HOURS);
    justInside.setMinutes(justInside.getMinutes() - 1);
    expect(isResumable(open, justInside)).toBe(true);
  });

  /** A record from last week would restore a stale reading and a stale place. */
  it('abandons a session older than the window', () => {
    expect(isResumable(open, new Date('2026-08-24T09:00:00.000Z'))).toBe(false);
  });

  it('never resumes a session that already ended', () => {
    const ended = { ...open, endedAt: '2026-08-17T09:05:00.000Z' };
    expect(isResumable(ended, new Date('2026-08-17T09:20:00.000Z'))).toBe(false);
  });

  /** A clock moved backwards must not make an old session look current. */
  it('rejects a session that claims to start in the future', () => {
    expect(isResumable(open, new Date('2026-08-17T08:00:00.000Z'))).toBe(false);
  });

  it('rejects a session with an unreadable start time', () => {
    expect(isResumable({ ...open, startedAt: 'not a date' }, new Date())).toBe(false);
  });
});

describe('reducer purity', () => {
  it('never mutates the state it is given', () => {
    const state = fresh();
    const snapshot = JSON.stringify(state);
    alertFlowReducer(state, { type: 'ANSWER_SAFETY', answer: 'no' });
    alertFlowReducer(state, { type: 'CHOOSE_STATE', stateId: 'scanning' });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('ignores an unknown event rather than throwing', () => {
    const state = fresh();
    expect(alertFlowReducer(state, { type: 'NOPE' } as unknown as AlertEvent)).toEqual(state);
  });
});
