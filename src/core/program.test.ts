import { describe, expect, it } from 'vitest';
import { activeWeek, isOverridden, programDay, suggestedWeek } from './program';

const START = '2026-08-01T08:00:00.000Z';
const at = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12, 0, 0);
const startLocal = new Date(2026, 7, 1, 8, 0, 0).toISOString();

describe('suggestedWeek', () => {
  it('is week 1 on the first day', () => {
    expect(suggestedWeek(startLocal, at(2026, 8, 1))).toBe(1);
  });

  it('stays in week 1 through day seven', () => {
    expect(suggestedWeek(startLocal, at(2026, 8, 7))).toBe(1);
  });

  it('moves to week 2 on day eight', () => {
    expect(suggestedWeek(startLocal, at(2026, 8, 8))).toBe(2);
  });

  it('moves to week 3 on day fifteen and week 4 on day twenty two', () => {
    expect(suggestedWeek(startLocal, at(2026, 8, 15))).toBe(3);
    expect(suggestedWeek(startLocal, at(2026, 8, 22))).toBe(4);
  });

  /** Someone returning after a long gap is not shown a week that does not exist. */
  it('clamps at week 4 no matter how much time has passed', () => {
    expect(suggestedWeek(startLocal, at(2026, 12, 31))).toBe(4);
    expect(suggestedWeek(startLocal, at(2030, 1, 1))).toBe(4);
  });

  it('returns week 1 for a start date in the future', () => {
    expect(suggestedWeek(startLocal, at(2026, 7, 1))).toBe(1);
  });

  it('returns week 1 rather than throwing for an unparseable start date', () => {
    expect(suggestedWeek('not a date', at(2026, 8, 20))).toBe(1);
  });

  it('accepts a UTC start string', () => {
    expect(suggestedWeek(START, at(2026, 8, 20))).toBe(3);
  });
});

describe('activeWeek', () => {
  it('uses the suggestion when there is no override', () => {
    expect(activeWeek({ programStartedAt: startLocal, weekOverride: null }, at(2026, 8, 10))).toBe(2);
  });

  /** Agency principle: a manual choice always wins over the schedule. */
  it('lets a manual override win in both directions', () => {
    expect(activeWeek({ programStartedAt: startLocal, weekOverride: 4 }, at(2026, 8, 2))).toBe(4);
    expect(activeWeek({ programStartedAt: startLocal, weekOverride: 1 }, at(2026, 9, 30))).toBe(1);
  });
});

describe('isOverridden', () => {
  it('reports whether the user has pinned a week', () => {
    expect(isOverridden({ weekOverride: null })).toBe(false);
    expect(isOverridden({ weekOverride: 2 })).toBe(true);
  });
});

describe('programDay', () => {
  it('is 1-based from the start date', () => {
    expect(programDay(startLocal, at(2026, 8, 1))).toBe(1);
    expect(programDay(startLocal, at(2026, 8, 2))).toBe(2);
    expect(programDay(startLocal, at(2026, 8, 28))).toBe(28);
  });

  it('never returns less than 1', () => {
    expect(programDay(startLocal, at(2026, 7, 20))).toBe(1);
  });

  it('returns 1 for an unparseable start date', () => {
    expect(programDay('nonsense', at(2026, 8, 20))).toBe(1);
  });
});
