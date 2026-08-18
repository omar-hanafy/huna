import { z } from 'zod';
import { stateIdSchema } from '../content/schema';

/** Unchanged from سَكينة v1 so day records migrate without remapping. */
export const CORE_TASK_IDS = [
  'orientation',
  'breathing',
  'movement',
  'checkins',
  'relaxation',
  'weekFocus',
] as const;
export const coreTaskIdSchema = z.enum(CORE_TASK_IDS);
export type CoreTaskId = z.infer<typeof coreTaskIdSchema>;

export const weekNumberSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type WeekNumber = z.infer<typeof weekNumberSchema>;

const activationSchema = z.number().int().min(0).max(10);
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date key');
const isoSchema = z.iso.datetime({ offset: true }).or(z.iso.datetime());

/** One of the short "راجع الإنذار" moments during the day. */
export const checkInSchema = z.object({
  id: z.string().min(1),
  createdAt: isoSchema,
  activation: activationSchema,
  note: z.string().nullable(),
});
export type CheckIn = z.infer<typeof checkInSchema>;

export const dayRecordSchema = z.object({
  date: dateKeySchema,
  week: weekNumberSchema,
  tasks: z.record(coreTaskIdSchema, z.boolean()),
  /** The end-of-day overall rating. Named to match the alert flow's vocabulary. */
  activation: activationSchema.nullable(),
  sleepHours: z.number().min(0).max(24).nullable(),
  recoveryMinutes: z.number().int().min(0).max(1440).nullable(),
  note: z.string(),
  busyDay: z.boolean(),
  checkIns: z.array(checkInSchema),
});
export type DayRecord = z.infer<typeof dayRecordSchema>;

export const safetyAnswerSchema = z.enum(['yes', 'no', 'unsure']);
export type SafetyAnswer = z.infer<typeof safetyAnswerSchema>;

export const alertStepSchema = z.enum(['safety', 'danger', 'seal', 'state', 'sequence', 'action', 'done']);

export const alertSessionSchema = z.object({
  id: z.string().min(1),
  startedAt: isoSchema,
  endedAt: isoSchema.nullable(),
  safetyAnswer: safetyAnswerSchema.nullable(),
  stateId: stateIdSchema.nullable(),
  /**
   * The screen the user was on. Absent on records written before this was
   * tracked, which resume from the other fields instead.
   */
  step: alertStepSchema.optional(),
  /** Where in the sequence an interrupted session resumes. Absent on old records. */
  stepIndex: z.number().int().min(0).optional(),
  activationBefore: activationSchema.nullable(),
  activationAfter: activationSchema.nullable(),
  chosenAction: z.string().nullable(),
  /** Null until the follow-up is answered; see followUpMissed. */
  actionCompleted: z.enum(['yes', 'partly', 'no']).nullable(),
  whatHelped: z.string().nullable(),
  /**
   * Set when the follow-up window (5 to 60 minutes after the session) passed
   * without the app being opened. Excluded from the return-to-life denominator
   * rather than counted as a failure.
   */
  followUpMissed: z.boolean(),
  followUpAnsweredAt: isoSchema.nullable(),
});
export type AlertSession = z.infer<typeof alertSessionSchema>;

export const safetyCheckSchema = z.object({
  id: z.string().min(1),
  at: isoSchema,
  target: z.string().min(1),
  /** `alert` when produced by the alert flow, `manual` from the check-once tool. */
  source: z.enum(['alert', 'manual']),
});
export type SafetyCheck = z.infer<typeof safetyCheckSchema>;

export const journalEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: isoSchema,
  trigger: z.string(),
  prediction: z.string(),
  evidenceDanger: z.string(),
  evidenceAlarm: z.string(),
  response: z.string(),
  recoveryMinutes: z.number().int().min(0).max(1440).nullable(),
  intensityBefore: activationSchema,
  intensityAfter: activationSchema,
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const ladderItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  expectedActivation: activationSchema,
  order: z.number().int().min(0),
  createdAt: isoSchema,
  archived: z.boolean(),
});
export type LadderItem = z.infer<typeof ladderItemSchema>;

export const sudsReadingSchema = z.object({
  /** Minutes elapsed since the session began. */
  minute: z.number().int().min(0).max(240),
  value: activationSchema,
});
export type SudsReading = z.infer<typeof sudsReadingSchema>;

export const ladderSessionSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  startedAt: isoSchema,
  endedAt: isoSchema.nullable(),
  readings: z.array(sudsReadingSchema),
  completed: z.boolean(),
  note: z.string(),
});
export type LadderSession = z.infer<typeof ladderSessionSchema>;

export const valueCommitmentSchema = z.object({
  id: z.string().min(1),
  date: dateKeySchema,
  value: z.string().min(1),
  action: z.string(),
  completed: z.boolean(),
});
export type ValueCommitment = z.infer<typeof valueCommitmentSchema>;

export const COPING_CARD_ID = 'coping-card';

export const copingCardSchema = z.object({
  id: z.literal(COPING_CARD_ID),
  whatHappens: z.string(),
  whatHelps: z.string(),
  whatDoesNotHelp: z.string(),
  mySentence: z.string(),
  myNextAction: z.string(),
  trustedPerson: z.string(),
  professional: z.string(),
  updatedAt: isoSchema,
});
export type CopingCard = z.infer<typeof copingCardSchema>;

export const trustedContactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  number: z.string().min(1),
});
export type TrustedContact = z.infer<typeof trustedContactSchema>;

export const PREFERENCES_ID = 'preferences';

/** 0 disables the reminder entirely; the app never blocks either way. */
export const LOCKOUT_OPTIONS = [0, 5, 10, 15, 30] as const;

export const preferencesSchema = z.object({
  id: z.literal(PREFERENCES_ID),
  locale: z.enum(['ar', 'en']),
  theme: z.enum(['system', 'light', 'dark']),
  /**
   * `worsens` removes every breath step across the whole app, replacing it with
   * the substitute declared in content. `unsure` keeps breathing available.
   */
  breathing: z.enum(['helps', 'worsens', 'unsure']),
  reducedMotion: z.boolean(),
  discreetMode: z.boolean(),
  showMetrics: z.boolean(),
  country: z.string().min(2),
  lockoutMinutes: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15), z.literal(30)]),
  trustedContacts: z.array(trustedContactSchema),
  busyDayDefault: z.boolean(),
  values: z.array(z.string()),
  onboardingCompletedAt: isoSchema.nullable(),
  programStartedAt: isoSchema,
  weekOverride: weekNumberSchema.nullable(),
});
export type UserPreferences = z.infer<typeof preferencesSchema>;

export const META_ID = 'meta';

export const metaSchema = z.object({
  id: z.literal(META_ID),
  schemaVersion: z.number().int().positive(),
  createdAt: isoSchema,
  /** Records that the سَكينة v1 localStorage import already ran. */
  migratedFrom: z.string().nullable(),
});
export type Meta = z.infer<typeof metaSchema>;

export const EXPORT_KIND = 'huna-export';
export const EXPORT_VERSION = 2;

export const exportBundleSchema = z.object({
  kind: z.literal(EXPORT_KIND),
  version: z.literal(EXPORT_VERSION),
  exportedAt: isoSchema,
  days: z.array(dayRecordSchema),
  alertSessions: z.array(alertSessionSchema),
  safetyChecks: z.array(safetyCheckSchema),
  journalEntries: z.array(journalEntrySchema),
  ladderItems: z.array(ladderItemSchema),
  ladderSessions: z.array(ladderSessionSchema),
  valueCommitments: z.array(valueCommitmentSchema),
  copingCard: copingCardSchema.nullable(),
  preferences: preferencesSchema,
  meta: metaSchema,
});
export type ExportBundle = z.infer<typeof exportBundleSchema>;

export interface ImportResult {
  ok: boolean;
  counts: Partial<Record<keyof ExportBundle, number>>;
  errors: string[];
}

export interface DateRange {
  from: string;
  to: string;
}

/**
 * Thrown when the browser refuses a write. The previous implementation swallowed
 * this, so the UI kept promising "saved automatically" while nothing persisted
 * (defect 4). Callers must surface it.
 */
export class StorageQuotaError extends Error {
  constructor(cause?: unknown) {
    super('Browser storage is full or the write was refused.');
    this.name = 'StorageQuotaError';
    this.cause = cause;
  }
}

export class StorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Persistent storage is unavailable in this browser.');
    this.name = 'StorageUnavailableError';
    this.cause = cause;
  }
}

/**
 * Clamps for every numeric field a user can type freely.
 *
 * The schemas above are strict so a corrupt file cannot slip through import,
 * which means every write site must stay inside their ranges: a single
 * out-of-range number stored today poisons the backup and makes it
 * unrestorable after an erase.
 */
export function clampActivationValue(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(10, Math.round(value)));
}

export function clampSleepHoursValue(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(24, value));
}

export function clampMinutesValue(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1440, Math.round(value)));
}

export function createDefaultPreferences(now: Date): UserPreferences {
  return {
    id: PREFERENCES_ID,
    locale: 'ar',
    theme: 'system',
    breathing: 'unsure',
    reducedMotion: false,
    discreetMode: false,
    showMetrics: true,
    country: 'EG',
    lockoutMinutes: 15,
    trustedContacts: [],
    busyDayDefault: false,
    values: [],
    onboardingCompletedAt: null,
    programStartedAt: now.toISOString(),
    weekOverride: null,
  };
}

export function createEmptyTasks(): Record<CoreTaskId, boolean> {
  return {
    orientation: false,
    breathing: false,
    movement: false,
    checkins: false,
    relaxation: false,
    weekFocus: false,
  };
}

export function createDayRecord(date: string, week: WeekNumber): DayRecord {
  return {
    date,
    week,
    tasks: createEmptyTasks(),
    activation: null,
    sleepHours: null,
    recoveryMinutes: null,
    note: '',
    busyDay: false,
    checkIns: [],
  };
}

export function createEmptyCopingCard(now: Date): CopingCard {
  return {
    id: COPING_CARD_ID,
    whatHappens: '',
    whatHelps: '',
    whatDoesNotHelp: '',
    mySentence: '',
    myNextAction: '',
    trustedPerson: '',
    professional: '',
    updatedAt: now.toISOString(),
  };
}
