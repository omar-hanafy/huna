import type { AppState, CoreTaskId, DayRecord, WeekNumber } from './types';

export const STORAGE_KEY = 'sakina.app-state.v1';

export function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  return toLocalDateKey(date);
}

export function createEmptyTasks(): Record<CoreTaskId, boolean> {
  return {
    orientation: false,
    breathing: false,
    movement: false,
    checkins: false,
    relaxation: false,
    weekFocus: false,
  };
}

export function createDayRecord(date: string, week: WeekNumber): DayRecord {
  return {
    date,
    week,
    tasks: createEmptyTasks(),
    vigilance: null,
    sleepHours: null,
    recoveryMinutes: null,
    note: '',
    checkIns: [],
  };
}

export function createInitialState(): AppState {
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    activeWeek: 1,
    days: {},
    journal: [],
    settings: {
      reducedMotion: false,
      compactMode: false,
      gentleReminders: true,
    },
  };
}

export function formatArabicDate(dateKey: string, options?: Intl.DateTimeFormatOptions) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('ar-EG', options ?? {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, day));
}

export function formatArabicTime(iso: string) {
  return new Intl.DateTimeFormat('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function calculateCompletion(day?: DayRecord) {
  if (!day) return 0;
  const values = Object.values(day.tasks);
  return (values.filter(Boolean).length / values.length) * 100;
}

export function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
