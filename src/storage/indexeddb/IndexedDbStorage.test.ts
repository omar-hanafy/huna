import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COPING_CARD_ID,
  EXPORT_KIND,
  EXPORT_VERSION,
  StorageQuotaError,
  StorageUnavailableError,
  createDayRecord,
  createEmptyTasks,
  type AlertSession,
  type JournalEntry,
  type LadderItem,
  type LadderSession,
  type SafetyCheck,
} from '../types';
import { collectEmergencyBundle } from '../emergencyExport';
import { HunaDatabase, wrapStorageErrors } from './db';
import { IndexedDbStorage } from './IndexedDbStorage';

const FIXED_NOW = new Date('2026-08-17T09:00:00.000Z');
const clock = { now: () => FIXED_NOW };

let counter = 0;
function freshStorage(): IndexedDbStorage {
  counter += 1;
  return new IndexedDbStorage(new HunaDatabase(`huna-test-${counter}`), clock);
}

let storage: IndexedDbStorage;
beforeEach(() => {
  storage = freshStorage();
});

function alertSession(overrides: Partial<AlertSession> = {}): AlertSession {
  return {
    id: 'session-1',
    startedAt: '2026-08-17T09:00:00.000Z',
    endedAt: '2026-08-17T09:02:00.000Z',
    safetyAnswer: 'no',
    stateId: 'scanning',
    activationBefore: 8,
    activationAfter: 5,
    chosenAction: 'أكمل ما كنت أفعله لدقيقتين',
    actionCompleted: 'yes',
    whatHelped: 'التثبيت البصري',
    followUpMissed: false,
    followUpAnsweredAt: '2026-08-17T09:10:00.000Z',
    ...overrides,
  };
}

/**
 * Reads run inside Dexie liveQuery subscriptions, which reject a readwrite
 * transaction. A getter that lazily persisted its default therefore threw
 * `ReadOnlyError` the moment a component subscribed to it. Initialisation is
 * explicit instead, and these tests hold the separation in place.
 */
describe('reads never write', () => {
  it('leaves the store untouched when the singleton getters are called', async () => {
    await storage.getPreferences();
    await storage.getMeta();
    await storage.getCopingCard();

    const bundle = await storage.exportAll();
    expect(bundle.copingCard).toBeNull();
    expect(bundle.days).toEqual([]);
  });

  it('returns usable defaults before initialise has run', async () => {
    const preferences = await storage.getPreferences();
    expect(preferences.locale).toBe('ar');
    expect(preferences.lockoutMinutes).toBe(15);

    const card = await storage.getCopingCard();
    expect(card.whatDoesNotHelp).toBe('');
  });
});

describe('initialise', () => {
  it('persists the first-run singletons', async () => {
    await storage.initialise();
    const first = await storage.getPreferences();
    const again = await storage.getPreferences();
    expect(again.programStartedAt).toBe(first.programStartedAt);
    expect((await storage.getMeta()).migratedFrom).toBeNull();
  });

  it('is idempotent and does not reset an existing record', async () => {
    await storage.initialise();
    await storage.savePreferences({ locale: 'en' });
    await storage.initialise();
    expect((await storage.getPreferences()).locale).toBe('en');
  });
});

describe('preferences', () => {
  it('returns defaults on first read and keeps them stable once initialised', async () => {
    await storage.initialise();
    const preferences = await storage.getPreferences();
    expect(preferences.locale).toBe('ar');
    expect(preferences.lockoutMinutes).toBe(15);
    expect(preferences.breathing).toBe('unsure');

    const again = await storage.getPreferences();
    expect(again.programStartedAt).toBe(preferences.programStartedAt);
  });

  it('merges a patch without dropping untouched fields', async () => {
    await storage.savePreferences({ locale: 'en' });
    const updated = await storage.savePreferences({ breathing: 'worsens' });
    expect(updated.locale).toBe('en');
    expect(updated.breathing).toBe('worsens');
    expect(updated.lockoutMinutes).toBe(15);
  });

  it('never lets a patch overwrite the singleton id', async () => {
    const updated = await storage.savePreferences({ locale: 'en' } as never);
    expect(updated.id).toBe('preferences');
  });
});

describe('days', () => {
  it('round-trips a day record', async () => {
    const record = createDayRecord('2026-08-17', 1);
    await storage.saveDay(record);
    expect(await storage.getDay('2026-08-17')).toEqual(record);
  });

  it('returns null for a day that was never written', async () => {
    expect(await storage.getDay('2026-01-01')).toBeNull();
  });

  it('creates the day on first update rather than failing', async () => {
    const updated = await storage.updateDay('2026-08-17', { sleepHours: 7 });
    expect(updated.sleepHours).toBe(7);
    expect(updated.date).toBe('2026-08-17');
  });

  /**
   * The patch reads the stored record inside the write transaction, which is
   * what stops a second edit from writing a stale copy back over the first.
   */
  it('applies a functional patch to what is stored, not to a stale copy', async () => {
    await storage.updateDay('2026-08-17', { tasks: { ...createEmptyTasks(), orientation: true } });
    const updated = await storage.updateDay('2026-08-17', (current) => ({
      tasks: { ...current.tasks, movement: true },
    }));
    expect(updated.tasks.orientation).toBe(true);
    expect(updated.tasks.movement).toBe(true);
  });

  it('files a newly created record under the week the program is on', async () => {
    await storage.savePreferences({ programStartedAt: '2026-08-03T09:00:00.000Z', weekOverride: null });
    const created = await storage.updateDay('2026-08-17', { note: 'x' });
    expect(created.week).toBe(3);
  });

  /** Numbers a user can type freely are clamped before they reach the store. */
  it('clamps out-of-range numbers instead of storing an unexportable record', async () => {
    const updated = await storage.updateDay('2026-08-17', {
      sleepHours: 900,
      recoveryMinutes: -5,
      activation: 42,
    });
    expect(updated.sleepHours).toBe(24);
    expect(updated.recoveryMinutes).toBe(0);
    expect(updated.activation).toBe(10);
  });

  it('filters by an inclusive date range and returns chronological order', async () => {
    for (const date of ['2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17']) {
      await storage.saveDay(createDayRecord(date, 1));
    }
    const days = await storage.getDays({ from: '2026-08-15', to: '2026-08-16' });
    expect(days.map((d) => d.date)).toEqual(['2026-08-15', '2026-08-16']);
  });
});

describe('alert sessions', () => {
  it('round-trips a session', async () => {
    const session = alertSession();
    await storage.saveAlertSession(session);
    expect(await storage.getAlertSession('session-1')).toEqual(session);
  });

  it('finds the most recent session that has not ended', async () => {
    await storage.saveAlertSession(alertSession({ id: 'a', startedAt: '2026-08-17T08:00:00.000Z' }));
    await storage.saveAlertSession(
      alertSession({ id: 'b', startedAt: '2026-08-17T08:30:00.000Z', endedAt: null }),
    );
    await storage.saveAlertSession(
      alertSession({ id: 'c', startedAt: '2026-08-17T09:00:00.000Z', endedAt: null }),
    );

    expect((await storage.getOpenAlertSession())?.id).toBe('c');
  });

  it('returns null when every session has ended', async () => {
    await storage.saveAlertSession(alertSession());
    expect(await storage.getOpenAlertSession()).toBeNull();
  });
});

describe('safety checks', () => {
  const check = (id: string, at: string): SafetyCheck => ({ id, at, target: 'door', source: 'manual' });

  it('returns the latest check by timestamp, not by insertion order', async () => {
    await storage.saveSafetyCheck(check('later', '2026-08-17T10:00:00.000Z'));
    await storage.saveSafetyCheck(check('earlier', '2026-08-17T08:00:00.000Z'));
    expect((await storage.getLastSafetyCheck())?.id).toBe('later');
  });

  it('returns null when nothing has been checked', async () => {
    expect(await storage.getLastSafetyCheck()).toBeNull();
  });

  /** The repeat-check chart reads a window, and reads it in order. */
  it('returns the checks inside a range, chronologically', async () => {
    await storage.saveSafetyCheck(check('c', '2026-08-17T10:00:00.000Z'));
    await storage.saveSafetyCheck(check('a', '2026-08-15T10:00:00.000Z'));
    await storage.saveSafetyCheck(check('b', '2026-08-16T10:00:00.000Z'));

    const all = await storage.getSafetyChecks();
    expect(all.map((item) => item.id)).toEqual(['a', 'b', 'c']);

    const ranged = await storage.getSafetyChecks({
      from: '2026-08-16T00:00:00.000Z',
      to: '2026-08-16T23:59:59.999Z',
    });
    expect(ranged.map((item) => item.id)).toEqual(['b']);
  });
});

describe('value commitments', () => {
  const commitment = (id: string, date: string) => ({
    id,
    date,
    value: 'العائلة',
    action: 'اتصال قصير',
    completed: false,
  });

  it('round-trips commitments and filters them by date', async () => {
    await storage.saveValueCommitment(commitment('b', '2026-08-17'));
    await storage.saveValueCommitment(commitment('a', '2026-08-10'));

    expect((await storage.getValueCommitments()).map((item) => item.id)).toEqual(['a', 'b']);
    const ranged = await storage.getValueCommitments({ from: '2026-08-15', to: '2026-08-20' });
    expect(ranged.map((item) => item.id)).toEqual(['b']);
  });
});

describe('journal', () => {
  const entry: JournalEntry = {
    id: 'j1',
    createdAt: '2026-08-17T09:00:00.000Z',
    trigger: 'صوت مفاجئ',
    prediction: 'حاجة وحشة هتحصل',
    evidenceDanger: 'لا شيء ملموس',
    evidenceAlarm: 'الصوت كان بابًا',
    response: 'ثبّتّ قدميّ',
    recoveryMinutes: 12,
    intensityBefore: 8,
    intensityAfter: 4,
  };

  it('returns entries newest first', async () => {
    await storage.saveJournalEntry(entry);
    await storage.saveJournalEntry({ ...entry, id: 'j2', createdAt: '2026-08-18T09:00:00.000Z' });
    expect((await storage.getJournalEntries()).map((e) => e.id)).toEqual(['j2', 'j1']);
  });

  it('deletes an entry', async () => {
    await storage.saveJournalEntry(entry);
    await storage.deleteJournalEntry('j1');
    expect(await storage.getJournalEntries()).toEqual([]);
  });
});

describe('ladder', () => {
  const item: LadderItem = {
    id: 'item-1',
    title: 'الجلوس في مقهى هادئ',
    expectedActivation: 4,
    order: 1,
    createdAt: '2026-08-17T09:00:00.000Z',
    archived: false,
  };
  const session: LadderSession = {
    id: 'ls-1',
    itemId: 'item-1',
    startedAt: '2026-08-17T09:00:00.000Z',
    endedAt: null,
    readings: [{ minute: 0, value: 6 }],
    completed: false,
    note: '',
  };

  it('orders items by their explicit order field', async () => {
    await storage.saveLadderItem({ ...item, id: 'b', order: 2 });
    await storage.saveLadderItem({ ...item, id: 'a', order: 1 });
    expect((await storage.getLadderItems()).map((i) => i.id)).toEqual(['a', 'b']);
  });

  /** Orphan sessions would silently distort the habituation chart. */
  it('deletes an item together with its sessions', async () => {
    await storage.saveLadderItem(item);
    await storage.saveLadderSession(session);
    await storage.deleteLadderItem('item-1');
    expect(await storage.getLadderSessions()).toEqual([]);
  });

  it('filters sessions by item', async () => {
    await storage.saveLadderSession(session);
    await storage.saveLadderSession({ ...session, id: 'ls-2', itemId: 'other' });
    expect((await storage.getLadderSessions('item-1')).map((s) => s.id)).toEqual(['ls-1']);
  });
});

describe('coping card', () => {
  it('returns an empty card before anything is written', async () => {
    const card = await storage.getCopingCard();
    expect(card.id).toBe(COPING_CARD_ID);
    expect(card.whatDoesNotHelp).toBe('');
  });

  it('merges a patch and stamps updatedAt', async () => {
    await storage.saveCopingCard({ whatHelps: 'قدمان على الأرض' });
    const card = await storage.saveCopingCard({ whatDoesNotHelp: 'التنفس العميق' });
    expect(card.whatHelps).toBe('قدمان على الأرض');
    expect(card.whatDoesNotHelp).toBe('التنفس العميق');
    expect(card.updatedAt).toBe(FIXED_NOW.toISOString());
  });
});

describe('export and import', () => {
  it('exports a bundle that its own schema accepts', async () => {
    await storage.saveDay(createDayRecord('2026-08-17', 1));
    await storage.saveAlertSession(alertSession());

    const bundle = await storage.exportAll();
    expect(bundle.kind).toBe(EXPORT_KIND);
    expect(bundle.version).toBe(EXPORT_VERSION);

    const target = freshStorage();
    const result = await target.importAll(bundle);
    expect(result.ok).toBe(true);
    expect(result.counts.days).toBe(1);
    expect(await target.getDay('2026-08-17')).not.toBeNull();
  });

  /** Defect 8: the previous check was a shallow `version === 1` comparison. */
  it('rejects a bundle with the right shape but a malformed record', async () => {
    const bundle = await storage.exportAll();
    const broken = { ...bundle, days: [{ date: 'not-a-date', week: 9 }] };
    const result = await freshStorage().importAll(broken);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects a bundle from an unknown export version', async () => {
    const bundle = await storage.exportAll();
    const result = await freshStorage().importAll({ ...bundle, version: 99 });
    expect(result.ok).toBe(false);
  });

  it('rejects entirely non-bundle input without throwing', async () => {
    for (const input of [null, undefined, 42, 'text', [], {}]) {
      const result = await freshStorage().importAll(input);
      expect(result.ok).toBe(false);
    }
  });

  /**
   * A partially applied import is indistinguishable from data loss, so an
   * invalid bundle must leave what is already stored untouched.
   */
  it('leaves existing data intact when the bundle is invalid', async () => {
    await storage.saveDay(createDayRecord('2026-08-17', 1));
    const result = await storage.importAll({ kind: EXPORT_KIND, version: EXPORT_VERSION });
    expect(result.ok).toBe(false);
    expect(await storage.getDay('2026-08-17')).not.toBeNull();
  });

  /**
   * A build that did not clamp inputs could store 900 hours of sleep, and the
   * strict schema then refused the user's own backup. The numbers are repaired
   * rather than the file being declared unreadable.
   */
  it('salvages a backup whose numbers fall outside the schema', async () => {
    const bundle = await storage.exportAll();
    const day = {
      ...createDayRecord('2026-08-17', 1),
      sleepHours: 900,
      recoveryMinutes: 99_999,
      activation: 44,
      checkIns: [{ id: 'c1', createdAt: '2026-08-17T09:00:00.000Z', activation: 99, note: null }],
    };
    const journalEntry: JournalEntry = {
      id: 'j1',
      createdAt: '2026-08-17T09:00:00.000Z',
      trigger: '',
      prediction: '',
      evidenceDanger: '',
      evidenceAlarm: '',
      response: '',
      recoveryMinutes: 5_000,
      intensityBefore: 99,
      intensityAfter: -3,
    };
    const target = freshStorage();
    const result = await target.importAll({
      ...bundle,
      days: [day],
      journalEntries: [journalEntry],
      alertSessions: [alertSession({ activationBefore: 88, activationAfter: -2, stepIndex: -4 })],
      ladderItems: [
        {
          id: 'l1',
          title: 'x',
          expectedActivation: 77,
          order: -2,
          createdAt: FIXED_NOW.toISOString(),
          archived: false,
        },
      ],
      ladderSessions: [
        {
          id: 'ls1',
          itemId: 'l1',
          startedAt: FIXED_NOW.toISOString(),
          endedAt: null,
          readings: [{ minute: 900, value: 55 }],
          completed: false,
          note: '',
        },
      ],
    });

    expect(result.ok).toBe(true);
    const restored = await target.getDay('2026-08-17');
    expect(restored?.sleepHours).toBe(24);
    expect(restored?.checkIns[0]?.activation).toBe(10);
  });

  it('still refuses a bundle that is structurally wrong, not merely out of range', async () => {
    const bundle = await storage.exportAll();
    const result = await freshStorage().importAll({ ...bundle, days: [{ sleepHours: 900 }] });
    expect(result.ok).toBe(false);
  });

  /**
   * The سَكينة v1 blob is a file a user can plausibly still have. Importing it
   * merges rather than replaces: the legacy format carries no preferences or
   * alert history, so a replace would trade real data for a partial restore.
   */
  it('imports a raw سَكينة v1 blob, keeping what is already stored', async () => {
    await storage.saveAlertSession(alertSession());
    const legacy = {
      version: 1,
      days: {
        '2026-08-10': {
          date: '2026-08-10',
          week: 1,
          tasks: { orientation: true },
          vigilance: 6,
          sleepHours: 7,
          recoveryMinutes: 20,
          note: 'x',
          checkIns: [],
        },
      },
    };

    const result = await storage.importAll(legacy);
    expect(result.ok).toBe(true);
    expect(result.counts.days).toBe(1);
    expect(await storage.getDay('2026-08-10')).not.toBeNull();
    // Not wiped by the merge.
    expect(await storage.getAlertSessions()).toHaveLength(1);
  });

  /**
   * The crash screen offers an export precisely when the app cannot build a
   * normal one, so that file is a raw table dump. If the importer could not
   * read it back, the rescue would be theatre.
   */
  it('imports a rescue dump written by the crash screen', async () => {
    await storage.saveDay(createDayRecord('2026-08-17', 1));
    await storage.saveAlertSession(alertSession());
    await storage.initialise();

    const rescue = await collectEmergencyBundle(null, (storage as unknown as { db: HunaDatabase }).db);

    const target = freshStorage();
    const result = await target.importAll(rescue);

    expect(result.ok).toBe(true);
    expect(await target.getDay('2026-08-17')).not.toBeNull();
    expect(await target.getAlertSessions()).toHaveLength(1);
  });

  it('replaces rather than merges, so a restore is a true restore', async () => {
    await storage.saveDay(createDayRecord('2026-08-01', 1));
    const bundle = await storage.exportAll();

    await storage.saveDay(createDayRecord('2026-08-17', 1));
    expect(await storage.getDays()).toHaveLength(2);

    await storage.importAll(bundle);
    expect((await storage.getDays()).map((d) => d.date)).toEqual(['2026-08-01']);
  });
});

describe('deleteAll', () => {
  it('clears every table', async () => {
    await storage.saveDay(createDayRecord('2026-08-17', 1));
    await storage.saveAlertSession(alertSession());
    await storage.saveJournalEntry({
      id: 'j',
      createdAt: '2026-08-17T09:00:00.000Z',
      trigger: '',
      prediction: '',
      evidenceDanger: '',
      evidenceAlarm: '',
      response: '',
      recoveryMinutes: null,
      intensityBefore: 5,
      intensityAfter: 5,
    });

    await storage.deleteAll();

    expect(await storage.getDays()).toEqual([]);
    expect(await storage.getAlertSessions()).toEqual([]);
    expect(await storage.getJournalEntries()).toEqual([]);
  });

  /**
   * The سَكينة v1 key is never deleted from localStorage, so the marker saying
   * "already imported" is the only thing standing between an erase and the next
   * launch resurrecting the very journal the user asked to destroy.
   */
  it('keeps the migration marker so an erase cannot be undone by the next launch', async () => {
    await storage.saveMeta({ migratedFrom: 'sakina.app-state.v1' });
    await storage.deleteAll();
    expect((await storage.getMeta()).migratedFrom).toBe('sakina.app-state.v1');
  });

  it('leaves no marker behind when there was never a migration', async () => {
    await storage.initialise();
    await storage.deleteAll();
    expect((await storage.getMeta()).migratedFrom).toBeNull();
  });
});

/**
 * Defect 4: these failures used to be swallowed, so the UI kept promising
 * "saved automatically" while nothing persisted.
 */
describe('error translation', () => {
  it('turns a quota failure into StorageQuotaError', async () => {
    const failing = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('full'), { name: 'QuotaExceededError' }));
    await expect(wrapStorageErrors(failing)).rejects.toBeInstanceOf(StorageQuotaError);
  });

  it('turns an unavailable-database failure into StorageUnavailableError', async () => {
    const failing = vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { name: 'SecurityError' }));
    await expect(wrapStorageErrors(failing)).rejects.toBeInstanceOf(StorageUnavailableError);
  });

  it('rethrows anything it does not recognise instead of hiding it', async () => {
    const failing = vi.fn().mockRejectedValue(new TypeError('programmer error'));
    await expect(wrapStorageErrors(failing)).rejects.toBeInstanceOf(TypeError);
  });

  it('passes a successful result straight through', async () => {
    await expect(wrapStorageErrors(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});
