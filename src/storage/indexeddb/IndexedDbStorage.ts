import type { AppStorage, DayPatch } from '../AppStorage';
import { activeWeek } from '../../core/program';
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
import {
  clampActivationValue,
  clampMinutesValue,
  clampSleepHoursValue,
} from '../types';
import { convertLegacyState, legacyStateSchema } from '../migrations/fromSakinaV1';
import { HunaDatabase, SCHEMA_VERSION, wrapStorageErrors } from './db';

/** Keeps free-typed numbers inside the ranges the export schema enforces. */
function sanitizeDayRecord(record: DayRecord): DayRecord {
  return {
    ...record,
    activation: record.activation === null ? null : clampActivationValue(record.activation),
    sleepHours: record.sleepHours === null ? null : clampSleepHoursValue(record.sleepHours),
    recoveryMinutes: record.recoveryMinutes === null ? null : clampMinutesValue(record.recoveryMinutes),
    checkIns: record.checkIns.map((checkIn) => ({
      ...checkIn,
      activation: clampActivationValue(checkIn.activation),
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampField(
  target: Record<string, unknown>,
  key: string,
  clamp: (value: number) => number,
): void {
  const value = target[key];
  if (typeof value === 'number') target[key] = clamp(value);
}

/**
 * Reshapes a crash-screen rescue dump into an ordinary bundle.
 *
 * The rescue file is a raw table dump rather than an export, because it is
 * written when the app is too broken to build one. Recognising it here is what
 * makes it worth having: a user who exported from the error screen can put
 * their data back rather than holding a file nothing will read.
 */
function fromRescueDump(bundle: unknown): unknown {
  if (!isRecord(bundle) || bundle.kind !== 'huna-emergency-export') return bundle;
  const tables = bundle.indexedDb;
  if (!isRecord(tables)) return bundle;

  const list = (name: string): unknown[] => (Array.isArray(tables[name]) ? (tables[name] as unknown[]) : []);
  const single = (name: string): unknown => list(name)[0] ?? null;

  return {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: typeof bundle.exportedAt === 'string' ? bundle.exportedAt : new Date().toISOString(),
    days: list('days'),
    alertSessions: list('alertSessions'),
    safetyChecks: list('safetyChecks'),
    journalEntries: list('journalEntries'),
    ladderItems: list('ladderItems'),
    ladderSessions: list('ladderSessions'),
    valueCommitments: list('valueCommitments'),
    copingCard: single('copingCard'),
    preferences: single('preferences'),
    meta: single('meta'),
  };
}

/**
 * Best-effort repair of a bundle written by a build that did not clamp inputs.
 * Only touches numeric ranges; anything structurally wrong still fails
 * validation afterwards, so a genuinely corrupt file cannot slip through.
 */
function salvageBundle(bundle: unknown): unknown {
  if (!isRecord(bundle)) return bundle;
  const copy = JSON.parse(JSON.stringify(bundle)) as Record<string, unknown>;

  const eachRecord = (value: unknown, visit: (item: Record<string, unknown>) => void): void => {
    if (!Array.isArray(value)) return;
    for (const item of value) if (isRecord(item)) visit(item);
  };

  eachRecord(copy.days, (day) => {
    clampField(day, 'activation', clampActivationValue);
    clampField(day, 'sleepHours', clampSleepHoursValue);
    clampField(day, 'recoveryMinutes', clampMinutesValue);
    eachRecord(day.checkIns, (checkIn) => clampField(checkIn, 'activation', clampActivationValue));
  });
  eachRecord(copy.journalEntries, (entry) => {
    clampField(entry, 'recoveryMinutes', clampMinutesValue);
    clampField(entry, 'intensityBefore', clampActivationValue);
    clampField(entry, 'intensityAfter', clampActivationValue);
  });
  eachRecord(copy.alertSessions, (session) => {
    clampField(session, 'activationBefore', clampActivationValue);
    clampField(session, 'activationAfter', clampActivationValue);
    clampField(session, 'stepIndex', (value) => Math.max(0, Math.round(value)));
  });
  eachRecord(copy.ladderItems, (item) => {
    clampField(item, 'expectedActivation', clampActivationValue);
    clampField(item, 'order', (value) => Math.max(0, Math.round(value)));
  });
  eachRecord(copy.ladderSessions, (session) => {
    eachRecord(session.readings, (reading) => {
      clampField(reading, 'minute', (value) => Math.max(0, Math.min(240, Math.round(value))));
      clampField(reading, 'value', clampActivationValue);
    });
  });

  return copy;
}

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

  /**
   * Writes the singleton records that have no meaningful lazy default.
   *
   * Reads must never write: `useLive` runs them inside a Dexie liveQuery, which
   * rejects a readwrite transaction. Initialisation is therefore explicit and
   * idempotent, called once at boot.
   */
  async initialise(): Promise<void> {
    await wrapStorageErrors(() =>
      // Transactional so the check and the write cannot straddle someone else's
      // write: an unwrapped check-then-put could see "no preferences yet",
      // stall, and then land defaults on top of a save that arrived meanwhile,
      // undoing the first thing the user ever told the app.
      this.db.transaction('rw', [this.db.preferences, this.db.meta], async () => {
        if (!(await this.db.preferences.get(PREFERENCES_ID))) {
          await this.db.preferences.put(createDefaultPreferences(this.clock.now()));
        }
        if (!(await this.db.meta.get(META_ID))) {
          await this.db.meta.put({
            id: META_ID,
            schemaVersion: SCHEMA_VERSION,
            createdAt: this.clock.now().toISOString(),
            migratedFrom: null,
          });
        }
      }),
    );
  }

  async getPreferences(): Promise<UserPreferences> {
    return wrapStorageErrors(async () => {
      const existing = await this.db.preferences.get(PREFERENCES_ID);
      return existing ?? createDefaultPreferences(this.clock.now());
    });
  }

  async savePreferences(patch: Partial<Omit<UserPreferences, 'id'>>): Promise<UserPreferences> {
    return wrapStorageErrors(() =>
      // Read-merge-write inside one transaction, so two near-simultaneous
      // patches (a debounce flush racing a tap, or a second tab) merge instead
      // of the earlier one being silently reverted.
      this.db.transaction('rw', this.db.preferences, async () => {
        const current =
          (await this.db.preferences.get(PREFERENCES_ID)) ?? createDefaultPreferences(this.clock.now());
        const next: UserPreferences = { ...current, ...patch, id: PREFERENCES_ID };
        await this.db.preferences.put(next);
        return next;
      }),
    );
  }

  async getMeta(): Promise<Meta> {
    return wrapStorageErrors(async () => {
      const existing = await this.db.meta.get(META_ID);
      return (
        existing ?? {
          id: META_ID,
          schemaVersion: SCHEMA_VERSION,
          createdAt: this.clock.now().toISOString(),
          migratedFrom: null,
        }
      );
    });
  }

  async saveMeta(patch: Partial<Omit<Meta, 'id'>>): Promise<Meta> {
    return wrapStorageErrors(() =>
      this.db.transaction('rw', this.db.meta, async () => {
        const current = (await this.db.meta.get(META_ID)) ?? {
          id: META_ID,
          schemaVersion: SCHEMA_VERSION,
          createdAt: this.clock.now().toISOString(),
          migratedFrom: null,
        };
        const next: Meta = { ...current, ...patch, id: META_ID };
        await this.db.meta.put(next);
        return next;
      }),
    );
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

  async updateDay(
    date: string,
    patch: DayPatch | ((current: DayRecord) => DayPatch),
  ): Promise<DayRecord> {
    return wrapStorageErrors(() =>
      this.db.transaction('rw', [this.db.days, this.db.preferences], async () => {
        const preferences =
          (await this.db.preferences.get(PREFERENCES_ID)) ?? createDefaultPreferences(this.clock.now());
        const existing = await this.db.days.get(date);
        // A record created here must carry the week the program is actually on,
        // or every day the user only edits from Today would be filed as week 1.
        const base = existing ?? createDayRecord(date, activeWeek(preferences, this.clock.now()));
        // Functional patches read the stored record, not a copy React rendered
        // some seconds ago, so concurrent edits cannot clobber each other.
        const applied = typeof patch === 'function' ? patch(base) : patch;
        const next = sanitizeDayRecord({ ...base, ...applied, date });
        await this.db.days.put(next);
        return next;
      }),
    );
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
      return existing ?? createEmptyCopingCard(this.clock.now());
    });
  }

  async saveCopingCard(patch: Partial<Omit<CopingCard, 'id'>>): Promise<CopingCard> {
    return wrapStorageErrors(() =>
      this.db.transaction('rw', this.db.copingCard, async () => {
        const current =
          (await this.db.copingCard.get(COPING_CARD_ID)) ?? createEmptyCopingCard(this.clock.now());
        const next: CopingCard = {
          ...current,
          ...patch,
          id: COPING_CARD_ID,
          updatedAt: this.clock.now().toISOString(),
        };
        await this.db.copingCard.put(next);
        return next;
      }),
    );
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
  async importAll(input: unknown): Promise<ImportResult> {
    // A crash-screen rescue dump is a bundle in a different coat.
    const bundle = fromRescueDump(input);
    const parsed = exportBundleSchema.safeParse(bundle);
    let data = parsed.success ? parsed.data : null;

    if (data === null) {
      // Old builds could store out-of-range numbers, which would make the
      // user's only backup unrestorable. Clamp the known numeric fields and
      // try once more before giving up.
      const salvaged = exportBundleSchema.safeParse(salvageBundle(bundle));
      if (salvaged.success) data = salvaged.data;
    }

    if (data === null) {
      const legacy = await this.importLegacyBlob(bundle);
      if (legacy) return legacy;
      return {
        ok: false,
        counts: {},
        errors: parsed.success
          ? []
          : parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
      };
    }
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

  /**
   * A سَكينة v1 localStorage blob dropped straight into the importer.
   *
   * Merges rather than replaces: the legacy format has no preferences or alert
   * history, so wiping the current store for it would trade real data for a
   * partial restore.
   */
  private async importLegacyBlob(bundle: unknown): Promise<ImportResult | null> {
    const legacy = legacyStateSchema.safeParse(bundle);
    if (!legacy.success) return null;

    const { days, journalEntries } = convertLegacyState(legacy.data);
    await wrapStorageErrors(async () => {
      await this.db.transaction('rw', [this.db.days, this.db.journalEntries], async () => {
        await this.db.days.bulkPut(days);
        await this.db.journalEntries.bulkPut(journalEntries);
      });
    });

    return {
      ok: true,
      counts: { days: days.length, journalEntries: journalEntries.length },
      errors: [],
    };
  }

  /**
   * Erases user data while keeping the migration marker.
   *
   * The سَكينة v1 localStorage key is deliberately never deleted, so if the
   * marker died with the erase, the next launch would silently re-import the
   * legacy journal that the user just asked to destroy.
   */
  async deleteAll(): Promise<void> {
    await wrapStorageErrors(async () => {
      const meta = await this.db.meta.get(META_ID);
      await this.clearAllTables();
      if (meta?.migratedFrom) {
        await this.db.meta.put({
          id: META_ID,
          schemaVersion: SCHEMA_VERSION,
          createdAt: this.clock.now().toISOString(),
          migratedFrom: meta.migratedFrom,
        });
      }
    });
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
