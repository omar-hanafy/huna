/**
 * Every date in this app is a local calendar day, not a UTC instant. A wave at
 * 00:30 belongs to that night, not to the following UTC day, so all conversions
 * go through here rather than through ad hoc `new Date(...)` calls scattered
 * across components (defect 20).
 */

export type DateKey = string;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Throws on malformed input so a bad key fails at the boundary. */
export function parseDateKey(key: DateKey): Date {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) throw new RangeError(`Invalid date key: ${key}`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid date key: ${key}`);
  return date;
}

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string' && DATE_KEY_PATTERN.test(value);
}

export function addDays(key: DateKey, offset: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
}

/**
 * Whole calendar days between two keys, ignoring clock time.
 *
 * Computed from the calendar rather than by dividing milliseconds, so a DST
 * transition inside the range cannot shift the answer by a day.
 */
export function daysBetween(from: DateKey, to: DateKey): number {
  const start = parseDateKey(from);
  const end = parseDateKey(to);
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / 86_400_000);
}

/** Local midnight following `now`. Used to schedule the day rollover. */
export function nextLocalMidnight(now: Date): Date {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next;
}

export function msUntilNextLocalMidnight(now: Date): number {
  return nextLocalMidnight(now).getTime() - now.getTime();
}

export function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 60_000;
}

export function formatDate(key: DateKey, locale: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(
    locale,
    options ?? { weekday: 'long', day: 'numeric', month: 'long' },
  ).format(parseDateKey(key));
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
