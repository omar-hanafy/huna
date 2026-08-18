import { describe, expect, it } from 'vitest';
import { taskProgress, visibleTaskIds } from './daily-tasks';
import { createDayRecord, createEmptyTasks, type DayRecord, type UserPreferences } from '../storage/types';

function day(patch: Partial<DayRecord> = {}): DayRecord {
  return { ...createDayRecord('2026-08-17', 1), ...patch };
}

const helps = { breathing: 'helps' } as Pick<UserPreferences, 'breathing'>;
const worsens = { breathing: 'worsens' } as Pick<UserPreferences, 'breathing'>;

describe('visibleTaskIds', () => {
  it('lists the whole routine on an ordinary day', () => {
    expect(visibleTaskIds(false, false)).toEqual([
      'orientation',
      'breathing',
      'movement',
      'checkins',
      'relaxation',
      'weekFocus',
    ]);
  });

  it('shortens the list on a busy day', () => {
    expect(visibleTaskIds(true, false)).toEqual(['orientation', 'breathing', 'movement', 'checkins']);
  });

  /**
   * Removed, not greyed out. Leaving a breath task on the list every day for
   * someone it makes worse is a daily invitation to fail at it.
   */
  it('removes breath work entirely when it makes things worse', () => {
    expect(visibleTaskIds(false, true)).not.toContain('breathing');
    expect(visibleTaskIds(true, true)).toEqual(['orientation', 'movement', 'checkins']);
  });
});

describe('taskProgress', () => {
  /** Home and Today read the same denominator, or they contradict each other. */
  it('counts only the tasks that are shown', () => {
    const record = day({
      busyDay: true,
      tasks: { ...createEmptyTasks(), orientation: true, relaxation: true },
    });
    const progress = taskProgress(record, worsens);
    expect(progress.total).toBe(3);
    expect(progress.done).toBe(1);
  });

  it('counts a full ordinary day', () => {
    const record = day({
      tasks: {
        orientation: true,
        breathing: true,
        movement: true,
        checkins: true,
        relaxation: true,
        weekFocus: true,
      },
    });

    expect(taskProgress(record, helps)).toEqual({ tasks: visibleTaskIds(false, false), done: 6, total: 6 });
  });

  it('reports nothing done before the day or the preferences have loaded', () => {
    expect(taskProgress(undefined, undefined).done).toBe(0);
    expect(taskProgress(null, helps).done).toBe(0);
    expect(taskProgress(undefined, undefined).total).toBe(6);
  });
});
