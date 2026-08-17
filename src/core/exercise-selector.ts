import type { Sequence, SequenceStep, SequencesFile, StateId } from '../content/schema';
import type { UserPreferences } from '../storage/types';

/**
 * Chooses the grounding sequence for a reported state, and adapts it to the
 * user's breathing preference.
 *
 * Breath focus increases distress for a significant share of this population,
 * so "breathing makes it worse" is not a soft preference that merely
 * deprioritises breath steps: every one of them is replaced by the substitute
 * the content author declared alongside it. The schema refuses to accept a
 * breath step without a substitute, so the replacement can never be missing.
 */

export type BreathingPreference = UserPreferences['breathing'];

export function breathingAllowed(preference: BreathingPreference): boolean {
  return preference !== 'worsens';
}

export function applyBreathingPreference(sequence: Sequence, preference: BreathingPreference): Sequence {
  if (breathingAllowed(preference)) return sequence;

  const steps: SequenceStep[] = sequence.steps.map((step) => {
    if (step.kind !== 'breath') return step;
    // Guaranteed present by `sequenceStepSchema`, which rejects a breath step
    // with no substitute. The fallback keeps this total rather than throwing
    // mid-episode if content were ever loaded without validation.
    return step.substitute ?? { ...step, kind: 'body' as const, substitute: undefined };
  });

  return { ...sequence, steps };
}

export function findSequence(sequences: SequencesFile, stateId: StateId): Sequence {
  const found = sequences.sequences.find((sequence) => sequence.id === stateId);
  if (found) return found;
  // The schema guarantees every state has a sequence, so this only fires if
  // content was loaded unvalidated. Falling back beats a blank screen.
  const fallback = sequences.sequences.find((sequence) => sequence.id === 'unsure');
  if (!fallback) throw new Error(`No sequence for state "${stateId}" and no fallback available.`);
  return fallback;
}

export function selectSequence(
  sequences: SequencesFile,
  stateId: StateId,
  preference: BreathingPreference,
): Sequence {
  return applyBreathingPreference(findSequence(sequences, stateId), preference);
}

/** Suggested total duration in seconds. The user is never rushed by it. */
export function sequenceSeconds(sequence: Sequence): number {
  return sequence.steps.reduce((total, step) => total + step.seconds, 0);
}
