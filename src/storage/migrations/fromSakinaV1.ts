import { z } from 'zod';
import type { AppStorage } from '../AppStorage';
import {
  coreTaskIdSchema,
  createEmptyTasks,
  weekNumberSchema,
  type CheckIn,
  type DayRecord,
  type JournalEntry,
} from '../types';

/** The key سَكينة v0.1 wrote to. Read once, never deleted. */
export const LEGACY_STORAGE_KEY = 'sakina.app-state.v1';
export const MIGRATION_ID = 'sakina.app-state.v1';

const legacyCheckInSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  vigilance: z.number(),
  note: z.string().optional(),
});

const legacyDaySchema = z.object({
  date: z.string(),
  week: z.number(),
  tasks: z.record(z.string(), z.boolean()),
  vigilance: z.number().nullable(),
  sleepHours: z.number().nullable(),
  recoveryMinutes: z.number().nullable(),
  note: z.string(),
  checkIns: z.array(legacyCheckInSchema),
});

const legacyJournalSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  trigger: z.string(),
  prediction: z.string(),
  evidenceDanger: z.string(),
  evidenceAlarm: z.string(),
  response: z.string(),
  recoveryMinutes: z.number().nullable(),
  intensityBefore: z.number(),
  intensityAfter: z.number(),
});

/**
 * Deliberately lenient about fields we no longer use, and strict about the ones
 * carrying real user history. A file written by a slightly different v0.1 build
 * should still bring the journal across.
 */
export const legacyStateSchema = z.object({
  version: z.literal(1),
  startedAt: z.string().optional(),
  activeWeek: z.number().optional(),
  days: z.record(z.string(), legacyDaySchema).default({}),
  journal: z.array(legacyJournalSchema).default([]),
  settings: z
    .object({
      reducedMotion: z.boolean().optional(),
      compactMode: z.boolean().optional(),
      gentleReminders: z.boolean().optional(),
    })
    .optional(),
});

export type LegacyState = z.infer<typeof legacyStateSchema>;

export interface MigrationResult {
  status: 'migrated' | 'nothing-to-migrate' | 'already-migrated' | 'unreadable';
  days: number;
  journalEntries: number;
  checkIns: number;
  /** Fields present in v1 that have no home in the new model. */
  droppedFields: string[];
}

function clampActivation(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function toWeek(value: unknown): 1 | 2 | 3 | 4 {
  const parsed = weekNumberSchema.safeParse(value);
  return parsed.success ? parsed.data : 1;
}

function convertDay(legacy: z.infer<typeof legacyDaySchema>): DayRecord {
  const tasks = createEmptyTasks();
  for (const [key, done] of Object.entries(legacy.tasks)) {
    const taskId = coreTaskIdSchema.safeParse(key);
    if (taskId.success) tasks[taskId.data] = done;
  }

  const checkIns: CheckIn[] = legacy.checkIns.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    activation: clampActivation(item.vigilance),
    note: item.note ?? null,
  }));

  return {
    date: legacy.date,
    week: toWeek(legacy.week),
    tasks,
    activation: legacy.vigilance === null ? null : clampActivation(legacy.vigilance),
    sleepHours: legacy.sleepHours,
    recoveryMinutes: legacy.recoveryMinutes === null ? null : Math.round(legacy.recoveryMinutes),
    note: legacy.note,
    busyDay: false,
    checkIns,
  };
}

function convertJournal(legacy: z.infer<typeof legacyJournalSchema>): JournalEntry {
  return {
    id: legacy.id,
    createdAt: legacy.createdAt,
    trigger: legacy.trigger,
    prediction: legacy.prediction,
    evidenceDanger: legacy.evidenceDanger,
    evidenceAlarm: legacy.evidenceAlarm,
    response: legacy.response,
    recoveryMinutes: legacy.recoveryMinutes === null ? null : Math.round(legacy.recoveryMinutes),
    intensityBefore: clampActivation(legacy.intensityBefore),
    intensityAfter: clampActivation(legacy.intensityAfter),
  };
}

/**
 * Imports a سَكينة v0.1 localStorage blob into the new store.
 *
 * The legacy key is never deleted: it costs nothing to keep and it is a free
 * second copy of the user's history. `meta.migratedFrom` guarantees the import
 * runs at most once, so re-running is a no-op rather than a duplicate.
 */
export async function migrateFromSakinaV1(raw: string | null, storage: AppStorage): Promise<MigrationResult> {
  const empty: MigrationResult = {
    status: 'nothing-to-migrate',
    days: 0,
    journalEntries: 0,
    checkIns: 0,
    droppedFields: [],
  };

  if (raw === null || raw.trim() === '') return empty;

  const meta = await storage.getMeta();
  if (meta.migratedFrom === MIGRATION_ID) return { ...empty, status: 'already-migrated' };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { ...empty, status: 'unreadable' };
  }

  const legacy = legacyStateSchema.safeParse(parsedJson);
  if (!legacy.success) return { ...empty, status: 'unreadable' };

  const days = Object.values(legacy.data.days).map(convertDay);
  const journalEntries = legacy.data.journal.map(convertJournal);
  const checkIns = days.reduce((sum, day) => sum + day.checkIns.length, 0);

  for (const day of days) await storage.saveDay(day);
  for (const entry of journalEntries) await storage.saveJournalEntry(entry);

  const droppedFields: string[] = [];
  if (legacy.data.settings?.compactMode !== undefined) droppedFields.push('settings.compactMode');
  if (legacy.data.settings?.gentleReminders !== undefined) {
    droppedFields.push('settings.gentleReminders');
  }

  await storage.savePreferences({
    reducedMotion: legacy.data.settings?.reducedMotion ?? false,
    weekOverride: legacy.data.activeWeek === undefined ? null : toWeek(legacy.data.activeWeek),
    ...(legacy.data.startedAt ? { programStartedAt: legacy.data.startedAt } : {}),
  });

  await storage.saveMeta({ migratedFrom: MIGRATION_ID });

  return {
    status: 'migrated',
    days: days.length,
    journalEntries: journalEntries.length,
    checkIns,
    droppedFields,
  };
}

/**
 * Reads the legacy blob. Isolated so callers stay free of direct storage access
 * and so tests can supply the string directly.
 */
export function readLegacyBlob(): string | null {
  try {
    return window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}
