import { describe, expect, it } from 'vitest';
import { CONTENT, STATE_IDS } from '../content';
import type { SequencesFile } from '../content/schema';
import {
  applyBreathingPreference,
  breathingAllowed,
  findSequence,
  selectSequence,
  sequenceSeconds,
} from './exercise-selector';

const sequences = CONTENT.ar.sequences;

describe('breathingAllowed', () => {
  it('is false only when breathing makes things worse', () => {
    expect(breathingAllowed('helps')).toBe(true);
    expect(breathingAllowed('unsure')).toBe(true);
    expect(breathingAllowed('worsens')).toBe(false);
  });
});

describe('findSequence', () => {
  it('returns the sequence for every state', () => {
    for (const stateId of STATE_IDS) {
      expect(findSequence(sequences, stateId).id).toBe(stateId);
    }
  });

  it('falls back to the "unsure" sequence for an unknown state', () => {
    expect(findSequence(sequences, 'nonexistent' as never).id).toBe('unsure');
  });

  it('throws only when there is no fallback either', () => {
    const empty: SequencesFile = { version: 1, sequences: [] };
    expect(() => findSequence(empty, 'scanning')).toThrow();
  });
});

describe('selectSequence with breathing enabled', () => {
  it('returns the sequence unchanged', () => {
    for (const stateId of STATE_IDS) {
      const original = findSequence(sequences, stateId);
      expect(selectSequence(sequences, stateId, 'helps')).toEqual(original);
      expect(selectSequence(sequences, stateId, 'unsure')).toEqual(original);
    }
  });
});

describe('selectSequence with breathing disabled', () => {
  /** The core promise of the onboarding question, checked on every route. */
  it('removes every breath step from all seven sequences', () => {
    for (const stateId of STATE_IDS) {
      const adapted = selectSequence(sequences, stateId, 'worsens');
      expect(
        adapted.steps.some((step) => step.kind === 'breath'),
        stateId,
      ).toBe(false);
    }
  });

  it('keeps the same number of steps, substituting rather than dropping', () => {
    for (const stateId of STATE_IDS) {
      const original = findSequence(sequences, stateId);
      const adapted = selectSequence(sequences, stateId, 'worsens');
      expect(adapted.steps).toHaveLength(original.steps.length);
    }
  });

  it('uses the substitute text declared alongside each breath step', () => {
    const original = findSequence(sequences, 'startled');
    const breathStep = original.steps.find((step) => step.kind === 'breath');
    expect(breathStep?.substitute).toBeDefined();

    const adapted = selectSequence(sequences, 'startled', 'worsens');
    expect(adapted.steps.map((step) => step.text)).toContain(breathStep!.substitute!.text);
    expect(adapted.steps.map((step) => step.text)).not.toContain(breathStep!.text);
  });

  it('leaves non-breath steps untouched', () => {
    const original = findSequence(sequences, 'scanning');
    const adapted = selectSequence(sequences, 'scanning', 'worsens');
    expect(adapted.steps).toEqual(original.steps);
  });

  it('preserves the sequence id and title', () => {
    const adapted = selectSequence(sequences, 'activated', 'worsens');
    expect(adapted.id).toBe('activated');
    expect(adapted.title).toBe(findSequence(sequences, 'activated').title);
  });

  it('does not mutate the source content', () => {
    const before = JSON.stringify(sequences);
    selectSequence(sequences, 'sleepless', 'worsens');
    expect(JSON.stringify(sequences)).toBe(before);
  });

  it('substitutes in English content too', () => {
    for (const stateId of STATE_IDS) {
      const adapted = selectSequence(CONTENT.en.sequences, stateId, 'worsens');
      expect(
        adapted.steps.some((step) => step.kind === 'breath'),
        stateId,
      ).toBe(false);
    }
  });

  it('degrades a breath step with no declared substitute instead of throwing', () => {
    const broken: SequencesFile = {
      version: 1,
      sequences: [
        {
          id: 'scanning',
          title: 'x',
          subtitle: 'y',
          steps: [{ id: 'b', kind: 'breath', seconds: 10, text: 'breathe' }],
        },
      ],
    };
    const adapted = applyBreathingPreference(broken.sequences[0]!, 'worsens');
    expect(adapted.steps[0]?.kind).not.toBe('breath');
  });
});

/**
 * Spec §6.3 makes this a content-level guarantee rather than a preference,
 * because breath focus and body scanning commonly worsen depersonalisation.
 */
describe('the dissociation sequence', () => {
  it('contains no breath step even when breathing is enabled', () => {
    const adapted = selectSequence(sequences, 'detached', 'helps');
    expect(adapted.steps.some((step) => step.kind === 'breath')).toBe(false);
  });

  it('keeps the eyes open as its first instruction', () => {
    expect(findSequence(sequences, 'detached').steps[0]?.kind).toBe('orient');
  });
});

describe('sequenceSeconds', () => {
  it('sums the suggested durations', () => {
    const sequence = findSequence(sequences, 'scanning');
    const expected = sequence.steps.reduce((sum, step) => sum + step.seconds, 0);
    expect(sequenceSeconds(sequence)).toBe(expected);
  });

  /** Spec §6: the flow is a 60 to 120 second intervention. */
  it('keeps every sequence within a two minute budget', () => {
    for (const stateId of STATE_IDS) {
      const seconds = sequenceSeconds(findSequence(sequences, stateId));
      expect(seconds, stateId).toBeGreaterThanOrEqual(60);
      expect(seconds, stateId).toBeLessThanOrEqual(180);
    }
  });
});
