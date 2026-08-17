import Dexie, { type Table } from 'dexie';
import {
  StorageQuotaError,
  StorageUnavailableError,
  type AlertSession,
  type CopingCard,
  type DayRecord,
  type JournalEntry,
  type LadderItem,
  type LadderSession,
  type Meta,
  type SafetyCheck,
  type UserPreferences,
  type ValueCommitment,
} from '../types';

export const DB_NAME = 'huna';
export const SCHEMA_VERSION = 1;

/**
 * Indexes are declared only where a query actually needs one. `days` is keyed by
 * its date string, which sorts chronologically as a side effect of the
 * YYYY-MM-DD format, so range queries need no extra index.
 */
export class HunaDatabase extends Dexie {
  days!: Table<DayRecord, string>;
  alertSessions!: Table<AlertSession, string>;
  safetyChecks!: Table<SafetyCheck, string>;
  journalEntries!: Table<JournalEntry, string>;
  ladderItems!: Table<LadderItem, string>;
  ladderSessions!: Table<LadderSession, string>;
  valueCommitments!: Table<ValueCommitment, string>;
  copingCard!: Table<CopingCard, string>;
  preferences!: Table<UserPreferences, string>;
  meta!: Table<Meta, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      days: 'date, week',
      alertSessions: 'id, startedAt, endedAt, followUpAnsweredAt',
      safetyChecks: 'id, at',
      journalEntries: 'id, createdAt',
      ladderItems: 'id, order',
      ladderSessions: 'id, itemId, startedAt',
      valueCommitments: 'id, date',
      copingCard: 'id',
      preferences: 'id',
      meta: 'id',
    });
  }
}

function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'QuotaExceededError';
  }
  const name = (error as { name?: string } | null)?.name;
  return name === 'QuotaExceededError' || name === 'QuotaExceeded';
}

function isUnavailableError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return (
    name === 'InvalidStateError' ||
    name === 'SecurityError' ||
    name === 'UnknownError' ||
    name === 'DatabaseClosedError' ||
    name === 'MissingAPIError'
  );
}

/**
 * Converts driver-level failures into the two errors the UI knows how to
 * explain. Silence here is what caused defect 4, so nothing is swallowed:
 * anything unrecognised is rethrown untouched.
 */
export async function wrapStorageErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isQuotaError(error)) throw new StorageQuotaError(error);
    if (isUnavailableError(error)) throw new StorageUnavailableError(error);
    throw error;
  }
}
