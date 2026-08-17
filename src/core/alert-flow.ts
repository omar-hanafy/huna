import type { StateId } from '../content/schema';
import type { AlertSession, SafetyAnswer } from '../storage/types';

/**
 * The alert flow, as a pure state machine.
 *
 * This module holds the safety-critical behaviour of the whole product, so it
 * lives apart from any screen: a redesign can move every pixel without being
 * able to change what happens when someone answers "there may be danger".
 *
 * Invariants the tests hold it to:
 *  - "yes" and "unsure" both lead to safety mode. Only an explicit "no"
 *    continues to grounding.
 *  - The seal never blocks. Both of its choices lead somewhere.
 *  - A refresh mid-flow resumes at the step the user was on.
 */

export type AlertStep = 'safety' | 'danger' | 'seal' | 'state' | 'sequence' | 'action' | 'done';

export type SealVariant =
  /** Shown right after answering "no", confirming the check was recorded. */
  | 'fresh'
  /** Shown before the question, because a check was recorded very recently. */
  | 're-entry';

export interface AlertFlowState {
  step: AlertStep;
  sessionId: string;
  startedAt: string;
  safetyAnswer: SafetyAnswer | null;
  sealVariant: SealVariant | null;
  stateId: StateId | null;
  /** Index into the selected sequence's steps. */
  stepIndex: number;
  activationBefore: number | null;
  /** Null means the user chose "nothing right now", which is a valid answer. */
  chosenAction: string | null;
  actionChosen: boolean;
}

export type AlertEvent =
  | { type: 'ANSWER_SAFETY'; answer: SafetyAnswer }
  | { type: 'SEAL_CONTINUE' }
  | { type: 'SEAL_RECHECK' }
  | { type: 'DANGER_RESOLVED' }
  | { type: 'SET_ACTIVATION_BEFORE'; value: number }
  | { type: 'CHOOSE_STATE'; stateId: StateId }
  | { type: 'NEXT_SEQUENCE_STEP'; stepCount: number }
  | { type: 'PREVIOUS_SEQUENCE_STEP' }
  | { type: 'FINISH_SEQUENCE' }
  | { type: 'CHOOSE_ACTION'; action: string | null }
  | { type: 'BACK' };

export interface StartOptions {
  sessionId: string;
  startedAt: string;
  /** True when a check was recorded inside the reminder window. */
  lockoutActive: boolean;
}

export function startAlertFlow({ sessionId, startedAt, lockoutActive }: StartOptions): AlertFlowState {
  return {
    // A recent check earns a reminder before the question is asked again.
    step: lockoutActive ? 'seal' : 'safety',
    sealVariant: lockoutActive ? 're-entry' : null,
    sessionId,
    startedAt,
    safetyAnswer: null,
    stateId: null,
    stepIndex: 0,
    activationBefore: null,
    chosenAction: null,
    actionChosen: false,
  };
}

const BACK_TARGETS: Partial<Record<AlertStep, AlertStep>> = {
  danger: 'safety',
  state: 'safety',
  sequence: 'state',
  action: 'sequence',
};

export function alertFlowReducer(state: AlertFlowState, event: AlertEvent): AlertFlowState {
  switch (event.type) {
    case 'ANSWER_SAFETY': {
      // Only an explicit "no" continues. "Unsure" is treated exactly like "yes",
      // because the app cannot resolve the uncertainty and must not guess.
      const continues = event.answer === 'no';
      return {
        ...state,
        safetyAnswer: event.answer,
        step: continues ? 'seal' : 'danger',
        sealVariant: continues ? 'fresh' : null,
      };
    }

    case 'SEAL_CONTINUE':
      return { ...state, step: 'state', sealVariant: null };

    case 'SEAL_RECHECK':
      // Never blocked: the user says something changed, so they get the question
      // again with a clean slate.
      return { ...state, step: 'safety', sealVariant: null, safetyAnswer: null };

    case 'DANGER_RESOLVED':
      return { ...state, step: 'state' };

    case 'SET_ACTIVATION_BEFORE':
      return { ...state, activationBefore: clampActivation(event.value) };

    case 'CHOOSE_STATE':
      return { ...state, stateId: event.stateId, step: 'sequence', stepIndex: 0 };

    case 'NEXT_SEQUENCE_STEP': {
      const next = state.stepIndex + 1;
      if (next >= event.stepCount) return { ...state, step: 'action', stepIndex: state.stepIndex };
      return { ...state, stepIndex: next };
    }

    case 'PREVIOUS_SEQUENCE_STEP':
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };

    case 'FINISH_SEQUENCE':
      return { ...state, step: 'action' };

    case 'CHOOSE_ACTION':
      return { ...state, chosenAction: event.action, actionChosen: true, step: 'done' };

    case 'BACK': {
      if (state.step === 'sequence' && state.stepIndex > 0) {
        return { ...state, stepIndex: state.stepIndex - 1 };
      }
      const target = BACK_TARGETS[state.step];
      if (!target) return state;
      // Going back to the question clears the previous answer so the user is
      // never carried forward on a stale one.
      if (target === 'safety') return { ...state, step: target, safetyAnswer: null, sealVariant: null };
      return { ...state, step: target };
    }

    default:
      return state;
  }
}

function clampActivation(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

const STEP_ROUTES: Record<AlertStep, string> = {
  safety: '/alert/safety',
  danger: '/alert/danger',
  seal: '/alert/seal',
  state: '/alert/state',
  sequence: '/alert/sequence',
  action: '/alert/action',
  done: '/alert/done',
};

export function routeForStep(step: AlertStep): string {
  return STEP_ROUTES[step];
}

export function stepForRoute(path: string): AlertStep | null {
  const entry = Object.entries(STEP_ROUTES).find(([, route]) => route === path);
  return entry ? (entry[0] as AlertStep) : null;
}

/** Serialises flow state onto the session record that gets persisted. */
export function toSession(state: AlertFlowState, base: AlertSession): AlertSession {
  return {
    ...base,
    id: state.sessionId,
    startedAt: state.startedAt,
    safetyAnswer: state.safetyAnswer,
    stateId: state.stateId,
    activationBefore: state.activationBefore,
    chosenAction: state.chosenAction,
  };
}

/** Steps before the grounding sequence begins. */
const PRE_GROUNDING: readonly AlertStep[] = ['safety', 'seal', 'state'];

/**
 * Rebuilds flow state from a session that was left open, so a refresh or an
 * accidental navigation resumes rather than restarting from the safety question.
 *
 * `lockoutActive` re-surfaces the seal when the user comes back inside the
 * reminder window and has not yet started the exercise. That is precisely the
 * compulsion this feature exists for: leaving and returning to check again. Once
 * grounding has begun, a refresh resumes where they were instead, because
 * interrupting an exercise to repeat a reminder would be its own small harm.
 */
export function resumeFrom(session: AlertSession, lockoutActive = false): AlertFlowState {
  const base: AlertFlowState = {
    step: 'safety',
    sessionId: session.id,
    startedAt: session.startedAt,
    safetyAnswer: session.safetyAnswer,
    sealVariant: null,
    stateId: session.stateId,
    stepIndex: 0,
    activationBefore: session.activationBefore,
    chosenAction: session.chosenAction,
    actionChosen: session.chosenAction !== null,
  };

  const resumed = ((): AlertFlowState => {
    if (session.safetyAnswer === null) return base;
    if (session.safetyAnswer !== 'no') return { ...base, step: 'danger' };
    if (session.stateId === null) return { ...base, step: 'state' };
    if (session.chosenAction === null) return { ...base, step: 'sequence' };
    return { ...base, step: 'action' };
  })();

  if (lockoutActive && PRE_GROUNDING.includes(resumed.step)) {
    return { ...resumed, step: 'seal', sealVariant: 're-entry' };
  }
  return resumed;
}

export function isTerminal(state: AlertFlowState): boolean {
  return state.step === 'done';
}
