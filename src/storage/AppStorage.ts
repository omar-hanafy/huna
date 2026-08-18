import type {
  AlertSession,
  CopingCard,
  DateRange,
  DayRecord,
  ExportBundle,
  ImportResult,
  JournalEntry,
  LadderItem,
  LadderSession,
  Meta,
  SafetyCheck,
  UserPreferences,
  ValueCommitment,
} from './types';

export type DayPatch = Partial<Omit<DayRecord, 'date'>>;

/**
 * The single boundary between the app and persistence.
 *
 * Nothing above this line knows that IndexedDB exists. A future native port
 * writes a new implementation against this interface rather than a new app
 * (spec §4.4), and tests swap in an in-memory implementation.
 *
 * Every mutating method may reject with `StorageQuotaError` or
 * `StorageUnavailableError`. Callers must not swallow those.
 */
export interface AppStorage {
  /**
   * Writes the singleton records that need a first-run value. Idempotent.
   *
   * Reads must never write, because they run inside Dexie liveQuery
   * subscriptions which reject readwrite transactions. Callers run this once at
   * boot, before anything subscribes.
   */
  initialise(): Promise<void>;

  // Preferences and metadata
  getPreferences(): Promise<UserPreferences>;
  savePreferences(patch: Partial<Omit<UserPreferences, 'id'>>): Promise<UserPreferences>;
  getMeta(): Promise<Meta>;
  saveMeta(patch: Partial<Omit<Meta, 'id'>>): Promise<Meta>;

  // Daily routine
  getDay(date: string): Promise<DayRecord | null>;
  getDays(range?: DateRange): Promise<DayRecord[]>;
  saveDay(record: DayRecord): Promise<void>;
  /**
   * Merges a patch into today's record, creating it if needed.
   *
   * Pass a function when the new value depends on the old one (toggling a task,
   * appending a check-in). It runs inside the same transaction as the write, so
   * two fields edited moments apart cannot overwrite each other with a stale
   * copy of the record.
   */
  updateDay(date: string, patch: DayPatch | ((current: DayRecord) => DayPatch)): Promise<DayRecord>;

  // The alert flow
  saveAlertSession(session: AlertSession): Promise<void>;
  getAlertSession(id: string): Promise<AlertSession | null>;
  getAlertSessions(range?: DateRange): Promise<AlertSession[]>;
  /** The most recent session that has not yet ended, if any. */
  getOpenAlertSession(): Promise<AlertSession | null>;

  // Check-once
  saveSafetyCheck(check: SafetyCheck): Promise<void>;
  getLastSafetyCheck(): Promise<SafetyCheck | null>;
  getSafetyChecks(range?: DateRange): Promise<SafetyCheck[]>;

  // Journal
  saveJournalEntry(entry: JournalEntry): Promise<void>;
  getJournalEntries(): Promise<JournalEntry[]>;
  deleteJournalEntry(id: string): Promise<void>;

  // Life ladder
  saveLadderItem(item: LadderItem): Promise<void>;
  getLadderItems(): Promise<LadderItem[]>;
  deleteLadderItem(id: string): Promise<void>;
  saveLadderSession(session: LadderSession): Promise<void>;
  getLadderSessions(itemId?: string): Promise<LadderSession[]>;

  // Values
  saveValueCommitment(commitment: ValueCommitment): Promise<void>;
  getValueCommitments(range?: DateRange): Promise<ValueCommitment[]>;

  // Coping card
  getCopingCard(): Promise<CopingCard>;
  saveCopingCard(patch: Partial<Omit<CopingCard, 'id'>>): Promise<CopingCard>;

  // Whole-store operations
  exportAll(): Promise<ExportBundle>;
  importAll(bundle: unknown): Promise<ImportResult>;
  deleteAll(): Promise<void>;
}
