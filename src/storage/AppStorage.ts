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
  // Preferences and metadata
  getPreferences(): Promise<UserPreferences>;
  savePreferences(patch: Partial<Omit<UserPreferences, 'id'>>): Promise<UserPreferences>;
  getMeta(): Promise<Meta>;
  saveMeta(patch: Partial<Omit<Meta, 'id'>>): Promise<Meta>;

  // Daily routine
  getDay(date: string): Promise<DayRecord | null>;
  getDays(range?: DateRange): Promise<DayRecord[]>;
  saveDay(record: DayRecord): Promise<void>;
  updateDay(date: string, patch: Partial<Omit<DayRecord, 'date'>>): Promise<DayRecord>;

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
