import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatDate,
  formatTime,
  isDateKey,
  minutesBetween,
  msUntilNextLocalMidnight,
  nextLocalMidnight,
  parseDateKey,
  toDateKey,
} from './date';

describe('toDateKey', () => {
  it('formats a local date, zero-padded', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  /**
   * A wave at half past midnight belongs to that night. Using UTC here would
   * file it under the next day for anyone east of Greenwich.
   */
  it('uses the local calendar day, not the UTC day', () => {
    expect(toDateKey(new Date(2026, 7, 17, 0, 30))).toBe('2026-08-17');
    expect(toDateKey(new Date(2026, 7, 17, 23, 30))).toBe('2026-08-17');
  });
});

describe('parseDateKey', () => {
  it('round-trips with toDateKey', () => {
    expect(toDateKey(parseDateKey('2026-08-17'))).toBe('2026-08-17');
  });

  it('returns local midnight', () => {
    const date = parseDateKey('2026-08-17');
    expect(date.getHours()).toBe(0);
    expect(date.getDate()).toBe(17);
  });

  it('throws on malformed input rather than yielding an Invalid Date', () => {
    expect(() => parseDateKey('17-08-2026')).toThrow(RangeError);
    expect(() => parseDateKey('2026-8-7')).toThrow(RangeError);
    expect(() => parseDateKey('')).toThrow(RangeError);
    expect(() => parseDateKey('not a date')).toThrow(RangeError);
  });
});

describe('isDateKey', () => {
  it('accepts only well-formed keys', () => {
    expect(isDateKey('2026-08-17')).toBe(true);
    expect(isDateKey('2026-8-17')).toBe(false);
    expect(isDateKey(20260817)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });
});

describe('addDays', () => {
  it('moves forward and backward', () => {
    expect(addDays('2026-08-17', 1)).toBe('2026-08-18');
    expect(addDays('2026-08-17', -1)).toBe('2026-08-16');
    expect(addDays('2026-08-17', 0)).toBe('2026-08-17');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days in both directions', () => {
    expect(daysBetween('2026-08-17', '2026-08-17')).toBe(0);
    expect(daysBetween('2026-08-17', '2026-08-24')).toBe(7);
    expect(daysBetween('2026-08-24', '2026-08-17')).toBe(-7);
  });

  it('spans a month boundary', () => {
    expect(daysBetween('2026-08-30', '2026-09-02')).toBe(3);
  });

  /**
   * Dividing elapsed milliseconds would return 6.958... across a spring-forward
   * transition and round to the wrong day.
   */
  it('is unaffected by a daylight saving transition inside the range', () => {
    expect(daysBetween('2026-03-27', '2026-04-03')).toBe(7);
    expect(daysBetween('2026-10-23', '2026-10-30')).toBe(7);
  });
});

describe('nextLocalMidnight', () => {
  it('returns midnight at the start of the following day', () => {
    const midnight = nextLocalMidnight(new Date(2026, 7, 17, 14, 30, 15));
    expect(midnight.getDate()).toBe(18);
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getSeconds()).toBe(0);
  });

  it('advances even when called exactly at midnight', () => {
    const midnight = nextLocalMidnight(new Date(2026, 7, 17, 0, 0, 0));
    expect(midnight.getDate()).toBe(18);
  });

  it('crosses a month boundary', () => {
    expect(nextLocalMidnight(new Date(2026, 7, 31, 23, 59)).getMonth()).toBe(8);
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('is positive and under 24 hours', () => {
    const ms = msUntilNextLocalMidnight(new Date(2026, 7, 17, 14, 30));
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(86_400_000);
  });

  it('is nearly a full day just after midnight', () => {
    const ms = msUntilNextLocalMidnight(new Date(2026, 7, 17, 0, 0, 1));
    expect(ms).toBeGreaterThan(86_000_000);
  });
});

describe('minutesBetween', () => {
  it('returns fractional minutes', () => {
    const from = new Date('2026-08-17T09:00:00.000Z');
    expect(minutesBetween(from, new Date('2026-08-17T09:15:00.000Z'))).toBe(15);
    expect(minutesBetween(from, new Date('2026-08-17T09:00:30.000Z'))).toBe(0.5);
  });

  it('is negative when the second instant is earlier', () => {
    const from = new Date('2026-08-17T09:00:00.000Z');
    expect(minutesBetween(from, new Date('2026-08-17T08:00:00.000Z'))).toBe(-60);
  });
});

describe('formatting', () => {
  it('formats a date key in Arabic without throwing', () => {
    expect(formatDate('2026-08-17', 'ar-EG', { day: 'numeric' })).toBeTruthy();
  });

  it('formats a time from an ISO string', () => {
    expect(formatTime('2026-08-17T09:05:00.000Z', 'en-GB')).toMatch(/\d/);
  });
});
