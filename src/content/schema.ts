import { z } from 'zod';

/**
 * Content is versioned data, deliberately kept free of code so that a future
 * native port can consume these files verbatim (spec §4.4).
 */

export const STATE_IDS = [
  'scanning',
  'startled',
  'activated',
  'detached',
  'predicting',
  'sleepless',
  'unsure',
] as const;

export const stateIdSchema = z.enum(STATE_IDS);
export type StateId = z.infer<typeof stateIdSchema>;

/**
 * `breath` is called out separately because breath focus increases distress for
 * a significant share of this population, so every breath step must ship with a
 * non-breath replacement (spec §2.8).
 */
export const STEP_KINDS = ['orient', 'sense', 'body', 'breath', 'move', 'thought', 'action'] as const;
export const stepKindSchema = z.enum(STEP_KINDS);
export type StepKind = z.infer<typeof stepKindSchema>;

const baseStepSchema = z.object({
  id: z.string().min(1),
  kind: stepKindSchema,
  /** Suggested dwell time. The user is never forced off a step by a timer. */
  seconds: z.number().int().positive().max(300),
  text: z.string().min(1),
  hint: z.string().min(1).optional(),
});

const substituteStepSchema = baseStepSchema.extend({
  kind: stepKindSchema.exclude(['breath']),
});

export const sequenceStepSchema = baseStepSchema
  .extend({
    /**
     * Required on breath steps: what replaces this step when the user has told
     * onboarding that breathing makes things worse.
     */
    substitute: substituteStepSchema.optional(),
  })
  .refine((step) => step.kind !== 'breath' || step.substitute !== undefined, {
    message: 'A breath step must declare a non-breath substitute.',
    path: ['substitute'],
  });

export type SequenceStep = z.infer<typeof sequenceStepSchema>;

export const sequenceSchema = z.object({
  id: stateIdSchema,
  /** The user-facing label of the state, as shown on the state card. */
  title: z.string().min(1),
  /** One short clarifying line under the title. */
  subtitle: z.string().min(1),
  steps: z.array(sequenceStepSchema).min(3).max(8),
});

export type Sequence = z.infer<typeof sequenceSchema>;

export const sequencesFileSchema = z
  .object({
    version: z.literal(1),
    sequences: z.array(sequenceSchema),
  })
  .refine((file) => new Set(file.sequences.map((s) => s.id)).size === file.sequences.length, {
    message: 'Sequence ids must be unique.',
  })
  .refine((file) => STATE_IDS.every((id) => file.sequences.some((s) => s.id === id)), {
    message: 'Every state id must have a sequence.',
  })
  .refine(
    (file) => {
      const detached = file.sequences.find((s) => s.id === 'detached');
      return !detached || detached.steps.every((step) => step.kind !== 'breath');
    },
    {
      message:
        'The dissociation sequence must contain no breath steps: breath focus and body scanning ' +
        'commonly worsen depersonalisation.',
      path: ['sequences'],
    },
  );

export type SequencesFile = z.infer<typeof sequencesFileSchema>;

export const programWeekSchema = z.object({
  number: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  focusTask: z.string().min(1),
  outcome: z.string().min(1),
  accent: z.enum(['sage', 'blue', 'sand', 'amber']),
  daily: z.array(z.string().min(1)).min(1),
  avoid: z.array(z.string().min(1)).min(1),
});

export type ProgramWeek = z.infer<typeof programWeekSchema>;

export const programFileSchema = z.object({
  version: z.literal(1),
  weeks: z.array(programWeekSchema).length(4),
});

export type ProgramFile = z.infer<typeof programFileSchema>;

export const crisisResourceSchema = z.object({
  label: z.string().min(1),
  /** Free-form so short codes and hotlines both fit. */
  number: z.string().min(3),
  note: z.string().min(1).optional(),
  /** Where the number was verified. Never written from memory (spec §14). */
  source: z.string().url(),
  lastVerified: z.iso.date(),
});

export type CrisisResource = z.infer<typeof crisisResourceSchema>;

export const crisisCountrySchema = z.object({
  /** ISO 3166-1 alpha-2, or `OTHER` for the generic fallback block. */
  country: z.union([z.string().length(2), z.literal('OTHER')]),
  label: z.string().min(1),
  /** Shown when no verified number exists for the user's country. */
  generalGuidance: z.string().min(1),
  resources: z.array(crisisResourceSchema),
});

export const crisisFileSchema = z
  .object({
    version: z.literal(1),
    countries: z.array(crisisCountrySchema).min(1),
  })
  .refine((file) => file.countries.some((c) => c.country === 'OTHER'), {
    message: 'A generic OTHER block is required so unverified countries never show a wrong number.',
  });

export type CrisisFile = z.infer<typeof crisisFileSchema>;

/**
 * UI copy is an arbitrarily nested map of strings. Exhaustively typing every key
 * would be brittle and would fight i18next; locale parity is enforced by test
 * instead.
 */
export type UiTree = { [key: string]: string | UiTree };

export const uiFileSchema: z.ZodType<UiTree> = z.lazy(() =>
  z.record(z.string(), z.union([z.string(), uiFileSchema])),
);
