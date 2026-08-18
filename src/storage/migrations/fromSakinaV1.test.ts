import { beforeEach, describe, expect, it } from 'vitest';
import { HunaDatabase } from '../indexeddb/db';
import { IndexedDbStorage } from '../indexeddb/IndexedDbStorage';
import { MIGRATION_ID, migrateFromSakinaV1 } from './fromSakinaV1';

let counter = 0;
function freshStorage(): IndexedDbStorage {
  counter += 1;
  return new IndexedDbStorage(new HunaDatabase(`huna-migration-${counter}`), {
    now: () => new Date('2026-08-17T09:00:00.000Z'),
  });
}

let storage: IndexedDbStorage;
beforeEach(() => {
  storage = freshStorage();
});

/** Shaped exactly as سَكينة v0.1 wrote it. */
const realisticBlob = JSON.stringify({
  version: 1,
  startedAt: '2026-07-01T06:00:00.000Z',
  activeWeek: 3,
  days: {
    '2026-08-15': {
      date: '2026-08-15',
      week: 2,
      tasks: {
        orientation: true,
        breathing: true,
        movement: false,
        checkins: true,
        relaxation: false,
        weekFocus: true,
      },
      vigilance: 7,
      sleepHours: 6.5,
      recoveryMinutes: 18,
      note: 'المشي بعد العصر ساعد',
      checkIns: [
        { id: 'c1', createdAt: '2026-08-15T09:00:00.000Z', vigilance: 8, note: 'قبل اجتماع' },
        { id: 'c2', createdAt: '2026-08-15T14:00:00.000Z', vigilance: 6 },
      ],
    },
    '2026-08-16': {
      date: '2026-08-16',
      week: 2,
      tasks: {
        orientation: false,
        breathing: false,
        movement: true,
        checkins: false,
        relaxation: false,
        weekFocus: false,
      },
      vigilance: null,
      sleepHours: null,
      recoveryMinutes: null,
      note: '',
      checkIns: [],
    },
  },
  journal: [
    {
      id: 'j1',
      createdAt: '2026-08-15T20:00:00.000Z',
      trigger: 'صوت باب',
      prediction: 'حد داخل',
      evidenceDanger: 'لا شيء',
      evidenceAlarm: 'الجيران',
      response: 'ثبّتّ قدميّ',
      recoveryMinutes: 12,
      intensityBefore: 9,
      intensityAfter: 4,
    },
  ],
  settings: { reducedMotion: true, compactMode: true, gentleReminders: false },
});

describe('migrateFromSakinaV1', () => {
  it('imports days, check-ins and journal entries from a realistic blob', async () => {
    const result = await migrateFromSakinaV1(realisticBlob, storage);

    expect(result.status).toBe('migrated');
    expect(result.days).toBe(2);
    expect(result.journalEntries).toBe(1);
    expect(result.checkIns).toBe(2);

    const day = await storage.getDay('2026-08-15');
    expect(day?.activation).toBe(7);
    expect(day?.sleepHours).toBe(6.5);
    expect(day?.note).toBe('المشي بعد العصر ساعد');
    expect(day?.tasks.orientation).toBe(true);
    expect(day?.tasks.movement).toBe(false);
    expect(day?.checkIns).toHaveLength(2);
    expect(day?.checkIns[0]?.activation).toBe(8);
    expect(day?.checkIns[0]?.note).toBe('قبل اجتماع');
    expect(day?.checkIns[1]?.note).toBeNull();

    const journal = await storage.getJournalEntries();
    expect(journal[0]?.trigger).toBe('صوت باب');
    expect(journal[0]?.intensityBefore).toBe(9);
  });

  it('carries the active week and start date into preferences', async () => {
    await migrateFromSakinaV1(realisticBlob, storage);
    const preferences = await storage.getPreferences();
    expect(preferences.weekOverride).toBe(3);
    expect(preferences.programStartedAt).toBe('2026-07-01T06:00:00.000Z');
    expect(preferences.reducedMotion).toBe(true);
  });

  it('reports which v1 settings have no home in the new model', async () => {
    const result = await migrateFromSakinaV1(realisticBlob, storage);
    expect(result.droppedFields).toEqual(['settings.compactMode', 'settings.gentleReminders']);
  });

  it('does nothing when there is no legacy blob', async () => {
    expect((await migrateFromSakinaV1(null, storage)).status).toBe('nothing-to-migrate');
    expect((await migrateFromSakinaV1('', storage)).status).toBe('nothing-to-migrate');
    expect((await migrateFromSakinaV1('   ', storage)).status).toBe('nothing-to-migrate');
  });

  it('reports unreadable input rather than throwing', async () => {
    expect((await migrateFromSakinaV1('{not json', storage)).status).toBe('unreadable');
    expect((await migrateFromSakinaV1('{"version":2}', storage)).status).toBe('unreadable');
    expect((await migrateFromSakinaV1('null', storage)).status).toBe('unreadable');
    expect((await migrateFromSakinaV1('[]', storage)).status).toBe('unreadable');
  });

  it('imports an otherwise-valid blob that is missing optional sections', async () => {
    const minimal = JSON.stringify({ version: 1, days: {}, journal: [] });
    const result = await migrateFromSakinaV1(minimal, storage);
    expect(result.status).toBe('migrated');
    expect(result.days).toBe(0);
  });

  /** Running twice must not duplicate history. */
  it('is a no-op on a second run', async () => {
    await migrateFromSakinaV1(realisticBlob, storage);
    const second = await migrateFromSakinaV1(realisticBlob, storage);

    expect(second.status).toBe('already-migrated');
    expect(await storage.getJournalEntries()).toHaveLength(1);
    expect(await storage.getDays()).toHaveLength(2);
  });

  it('records the migration source in meta', async () => {
    await migrateFromSakinaV1(realisticBlob, storage);
    expect((await storage.getMeta()).migratedFrom).toBe(MIGRATION_ID);
  });

  it('clamps out-of-range activation values instead of rejecting the record', async () => {
    const odd = JSON.stringify({
      version: 1,
      days: {
        '2026-08-15': {
          date: '2026-08-15',
          week: 99,
          tasks: {},
          vigilance: 42,
          sleepHours: null,
          recoveryMinutes: 3.7,
          note: '',
          checkIns: [{ id: 'c', createdAt: '2026-08-15T09:00:00.000Z', vigilance: -5 }],
        },
      },
      journal: [],
    });

    await migrateFromSakinaV1(odd, storage);
    const day = await storage.getDay('2026-08-15');
    expect(day?.activation).toBe(10);
    expect(day?.week).toBe(1);
    expect(day?.recoveryMinutes).toBe(4);
    expect(day?.checkIns[0]?.activation).toBe(0);
  });

  it('ignores unknown task ids rather than corrupting the task map', async () => {
    const withJunk = JSON.stringify({
      version: 1,
      days: {
        '2026-08-15': {
          date: '2026-08-15',
          week: 1,
          tasks: { orientation: true, somethingRemoved: true },
          vigilance: null,
          sleepHours: null,
          recoveryMinutes: null,
          note: '',
          checkIns: [],
        },
      },
      journal: [],
    });

    await migrateFromSakinaV1(withJunk, storage);
    const day = await storage.getDay('2026-08-15');
    expect(day?.tasks.orientation).toBe(true);
    expect(Object.keys(day?.tasks ?? {}).sort()).toEqual(
      ['breathing', 'checkins', 'movement', 'orientation', 'relaxation', 'weekFocus'].sort(),
    );
  });

  it('produces days that satisfy the current day schema', async () => {
    await migrateFromSakinaV1(realisticBlob, storage);
    const bundle = await storage.exportAll();
    // exportAll round-trips through importAll, which validates every record.
    const target = freshStorage();
    expect((await target.importAll(bundle)).ok).toBe(true);
  });

  /**
   * v1 wrote whatever string it was holding. A single `2026-8-3` copied through
   * unchanged satisfies nothing in the new schema, and the user only finds out
   * when their backup refuses to import, long after the data is gone.
   */
  it('repairs loose dates and timestamps rather than storing them', async () => {
    const loose = JSON.stringify({
      version: 1,
      startedAt: 'sometime in July',
      days: {
        '2026-8-3': {
          date: '2026-8-3',
          week: 1,
          tasks: {},
          vigilance: 5,
          sleepHours: 7,
          recoveryMinutes: 10,
          note: 'أول يوم',
          checkIns: [{ id: 'c1', createdAt: '2026-08-03 09:00', vigilance: 4 }],
        },
      },
      journal: [
        {
          id: 'j1',
          createdAt: 'not a date at all',
          trigger: 'صوت',
          prediction: '',
          evidenceDanger: '',
          evidenceAlarm: '',
          response: '',
          recoveryMinutes: null,
          intensityBefore: 6,
          intensityAfter: 4,
        },
      ],
    });

    const result = await migrateFromSakinaV1(loose, storage);
    expect(result.status).toBe('migrated');

    // Filed under a real date key, and the note survived.
    expect((await storage.getDay('2026-08-03'))?.note).toBe('أول يوم');
    // The journal entry kept its text rather than being thrown away.
    expect((await storage.getJournalEntries())[0]?.trigger).toBe('صوت');

    // And the whole store still exports into something that imports back.
    const bundle = await storage.exportAll();
    expect((await freshStorage().importAll(bundle)).ok).toBe(true);
  });

  /** A date that is not a date at all is dropped, not stored as one. */
  it('drops a day whose key cannot be read as a date', async () => {
    const nonsense = JSON.stringify({
      version: 1,
      days: {
        yesterday: {
          date: 'yesterday',
          week: 1,
          tasks: {},
          vigilance: null,
          sleepHours: null,
          recoveryMinutes: null,
          note: '',
          checkIns: [],
        },
      },
      journal: [],
    });

    const result = await migrateFromSakinaV1(nonsense, storage);
    expect(result.days).toBe(0);
    expect(await storage.getDays()).toEqual([]);
  });
});
