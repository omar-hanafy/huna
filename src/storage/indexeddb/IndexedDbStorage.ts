import type { AppStorage } from '../AppStorage';
import {
  COPING_CARD_ID,
  EXPORT_KIND,
  EXPORT_VERSION,
  META_ID,
  PREFERENCES_ID,
  createDayRecord,
  createDefaultPreferences,
  createEmptyCopingCard,
  exportBundleSchema,
  type AlertSession,
  type CopingCard,
  type DateRange,
  type DayRecord,
  type ExportBundle,
  type ImportResult,
  type JournalEntry,
  type LadderItem,
  type LadderSession,
  type Meta,
  type SafetyCheck,
  type UserPreferences,
  type ValueCommitment,
} from '../types';
import { HunaDatabase, SCHEMA_VERSION, wrapStorageErrors } from './db';

/** Injectable so tests are deterministic and `src/core` purity rules hold. */
export interface StorageClock {
  now(): Date;
}

const systemClock: StorageClock = { now: () => new Date() };

export class IndexedDbStorage implements AppStorage {
  constructor(
    private readonly db: HunaDatabase = new HunaDatabase(),
    private readonly clock: StorageClock = systemClock,
  ) {}

  // -------------------------------------------------------------- preferences

  async getPreferences(): Promise<UserPreferences> {
    return wrapStorageErrors(async () => {
      const existing = await this.db.preferences.get(PREFERENCES_ID);
      if (existing) return existing;
      const defaults = createDefaultPreferences(this.clock.now());
      await this.db.preferences.put(defaults);
      return defaults;
    });
  }

  async savePreferences(patch: Partial<Omit<UserPreferences, 'id'>>): Promise<UserPreferences> {
    return wrapStorageErrors(async () => {
      const current = await this.getPreferences();
      const next: UserPreferences = { ...current, ...patch, id: PREFERENCES_ID };
      await this.db.preferences.put(next);
      return next;
    });
  }

  async getMeta(): Promise<Meta> {
    return wrapStorageErrors(async () => {
      const existing = await this.db.meta.get(META_ID);
      if (existing) return existing;
      const fresh: Meta = {
        id: META_ID,
        schemaVersion: SCHEMA_VERSION,
        createdAt: this.clock.now().toISOString(),
        migratedFrom: null,
      };
      await this.db.meta.put(fresh);
      return fresh;
    });
  }

  async saveMeta(patch: Partial<Omit<Meta, 'id'>>): Promise<Meta> {
    return wrapStorageErrors(async () => {
      const current = await this.getMeta();
      const next: Meta = { ...current, ...patch, id: META_ID };
      await this.db.meta.put(next);
      return next;
    });
  }

  // --------------------------------------------------------------------- days

  async getDay(date: string): Promise<DayRecord | null> {
    return wrapStorageErrors(async () => (await this.db.days.get(date)) ?? null);
  }

  async getDays(range?: DateRange): Promise<DayRecord[]> {
    return wrapStorageErrors(async () => {
      const collection = range
        ? this.db.days.where('date').between(range.from, range.to, true, true)
        : this.db.days.toCollection();
      return (await collection.toArray()).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  async saveDay(record: DayRecord): Promise<void> {
    await wrapStorageErrors(() => this.db.days.put(record));
  }

  async updateDay(date: string, patch: Partial<Omit<DayRecord, 'date'>>): Promise<DayRecord> {
    return wrapStorageErrors(async () => {
      const preferences = await this.getPreferences();
      const existing = await this.db.days.get(date);
      const base = existing ?? createDayRecord(date, preferences.weekOverride ?? 1);
      const next: DayRecord = { ...base, ...patch, date };
      await this.db.days.put(next);
      return next;
    });
  }

  // ------------------------------------------------------------ alert flow

  async saveAlertSession(session: AlertSession): Promise<void> {
    await wrapStorageErrors(() => this.db.alertSessions.put(session));
  }

  async getAlertSession(id: string): Promise<AlertSession | null> {
    return wrapStorageErrors(async () => (await this.db.alertSessions.get(id)) ?? null);
  }

  async getAlertSessions(range?: DateRange): Promise<AlertSession[]> {
    return wrapStorageErrors(async () => {
      const all = await this.db.alertSessions.toArray();
      const filtered = range ? all.filter((s) => s.startedAt >= range.from && s.startedAt <= range.to) : all;
      return filtered.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    });
  }

  async getOpenAlertSession(): Promise<AlertSession | null> {
    return wrapStorageErrors(async () => {
      const open = (await this.db.alertSessions.toArray()).filter((s) => s.endedAt === null);
      if (!open.length) return null;
      return open.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
    });
  }

  // ----------------------------------------------------------- safety checks

  async saveSafetyCheck(check: SafetyCheck): Promise<void> {
    await wrapStorageErrors(() => this.db.safetyChecks.put(check));
  }

  async getLastSafetyCheck(): Promise<SafetyCheck | null> {
    return wrapStorageErrors(async () => {
      const latest = await this.db.safetyChecks.orderBy('at').last();
      return latest ?? null;
    });
  }

  async getSafetyChecks(range?: DateRange): Promise<SafetyCheck[]> {
    return wrapStorageErrors(async () => {
      const collection = range
        ? this.db.safetyChecks.where('at').between(range.from, range.to, true, true)
        : this.db.safetyChecks.toCollection();
      return (await collection.toArray()).sort((a, b) => a.at.localeCompare(b.at));
    });
  }

  // ------------------------------------------------------------------ journal

  async saveJournalEntry(entry: JournalEntry): Promise<void> {
    await wrapStorageErrors(() => this.db.journalEntries.put(entry));
  }

  async getJournalEntries(): Promise<JournalEntry[]> {
    return wrapStorageErrors(async () =>
      (await this.db.journalEntries.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  async deleteJournalEntry(id: string): Promise<void> {
    await wrapStorageErrors(() => this.db.journalEntries.delete(id));
  }

  // ------------------------------------------------------------------- ladder

  async saveLadderItem(item: LadderItem): Promise<void> {
    await wrapStorageErrors(() => this.db.ladderItems.put(item));
  }

  async getLadderItems(): Promise<LadderItem[]> {
    return wrapStorageErrors(async () =>
      (await this.db.ladderItems.toArray()).sort((a, b) => a.order - b.order),
    );
  }

  async deleteLadderItem(id: string): Promise<void> {
    await wrapStorageErrors(async () => {
      await this.db.ladderItems.delete(id);
      const sessions = await this.db.ladderSessions.where('itemId').equals(id).primaryKeys();
      await this.db.ladderSessions.bulkDelete(sessions);
    });
  }

  async saveLadderSession(session: LadderSession): Promise<void> {
    await wrapStorageErrors(() => this.db.ladderSessions.put(session));
  }

  async getLadderSessions(itemId?: string): Promise<LadderSession[]> {
    return wrapStorageErrors(async () => {
      const all = itemId
        ? await this.db.ladderSessions.where('itemId').equals(itemId).toArray()
        : await this.db.ladderSessions.toArray();
      return all.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    });
  }

  // ------------------------------------------------------------------- values

  async saveValueCommitment(commitment: ValueCommitment): Promise<void> {
    await wrapStorageErrors(() => this.db.valueCommitments.put(commitment));
  }

  async getValueCommitments(range?: DateRange): Promise<ValueCommitment[]> {
    return wrapStorageErrors(async () => {
      const collection = range
        ? this.db.valueCommitments.where('date').between(range.from, range.to, true, true)
        : this.db.valueCommitments.toCollection();
      return (await collection.toArray()).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  // -------------------------------------------------------------- coping card

  async getCopingCard(): Promise<CopingCard> {
    return wrapStorageErrors(async () => {
      const existing = await this.db.copingCard.get(COPING_CARD_ID);
      if (existing) return existing;
      const fresh = createEmptyCopingCard(this.clock.now());
      await this.db.copingCard.put(fresh);
      return fresh;
    });
  }

  async saveCopingCard(patch: Partial<Omit<CopingCard, 'id'>>): Promise<CopingCard> {
    return wrapStorageErrors(async () => {
      const current = await this.getCopingCard();
      const next: CopingCard = {
        ...current,
        ...patch,
        id: COPING_CARD_ID,
        updatedAt: this.clock.now().toISOString(),
      };
      await this.db.copingCard.put(next);
      return next;
    });
  }

  // ------------------------------------------------------------ whole store

  async exportAll(): Promise<ExportBundle> {
    return wrapStorageErrors(async () => ({
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      exportedAt: this.clock.now().toISOString(),
      days: await this.db.days.toArray(),
      alertSessions: await this.db.alertSessions.toArray(),
      safetyChecks: await this.db.safetyChecks.toArray(),
      journalEntries: await this.db.journalEntries.toArray(),
      ladderItems: await this.db.ladderItems.toArray(),
      ladderSessions: await this.db.ladderSessions.toArray(),
      valueCommitments: await this.db.valueCommitments.toArray(),
      copingCard: (await this.db.copingCard.get(COPING_CARD_ID)) ?? null,
      preferences: await this.getPreferences(),
      meta: await this.getMeta(),
    }));
  }

  /**
   * Replaces the whole store, but only after the entire bundle validates.
   * A partially valid file leaves existing data untouched rather than importing
   * half of it, because a half-import is indistinguishable from data loss.
   */
  async importAll(bundle: unknown): Promise<ImportResult> {
    const parsed = exportBundleSchema.safeParse(bundle);
    if (!parsed.success) {
      return {
        ok: false,
        counts: {},
        errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
      };
    }

    const data = parsed.data;
    await wrapStorageErrors(async () => {
      await this.db.transaction(
        'rw',
        [
          this.db.days,
          this.db.alertSessions,
          this.db.safetyChecks,
          this.db.journalEntries,
          this.db.ladderItems,
          this.db.ladderSessions,
          this.db.valueCommitments,
          this.db.copingCard,
          this.db.preferences,
          this.db.meta,
        ],
        async () => {
          await this.clearAllTables();
          await this.db.days.bulkPut(data.days);
          await this.db.alertSessions.bulkPut(data.alertSessions);
          await this.db.safetyChecks.bulkPut(data.safetyChecks);
          await this.db.journalEntries.bulkPut(data.journalEntries);
          await this.db.ladderItems.bulkPut(data.ladderItems);
          await this.db.ladderSessions.bulkPut(data.ladderSessions);
          await this.db.valueCommitments.bulkPut(data.valueCommitments);
          if (data.copingCard) await this.db.copingCard.put(data.copingCard);
          await this.db.preferences.put(data.preferences);
          await this.db.meta.put(data.meta);
        },
      );
    });

    return {
      ok: true,
      counts: {
        days: data.days.length,
        alertSessions: data.alertSessions.length,
        safetyChecks: data.safetyChecks.length,
        journalEntries: data.journalEntries.length,
        ladderItems: data.ladderItems.length,
        ladderSessions: data.ladderSessions.length,
        valueCommitments: data.valueCommitments.length,
      },
      errors: [],
    };
  }

  async deleteAll(): Promise<void> {
    await wrapStorageErrors(() => this.clearAllTables());
  }

  private async clearAllTables(): Promise<void> {
    await Promise.all([
      this.db.days.clear(),
      this.db.alertSessions.clear(),
      this.db.safetyChecks.clear(),
      this.db.journalEntries.clear(),
      this.db.ladderItems.clear(),
      this.db.ladderSessions.clear(),
      this.db.valueCommitments.clear(),
      this.db.copingCard.clear(),
      this.db.preferences.clear(),
      this.db.meta.clear(),
    ]);
  }
}
