export type WeekNumber = 1 | 2 | 3 | 4;

export type CoreTaskId = 'orientation' | 'breathing' | 'movement' | 'checkins' | 'relaxation' | 'weekFocus';

export type ViewId = 'today' | 'plan' | 'tools' | 'journal' | 'progress' | 'settings';

export interface CheckIn {
  id: string;
  createdAt: string;
  vigilance: number;
  note?: string;
}

export interface DayRecord {
  date: string;
  week: WeekNumber;
  tasks: Record<CoreTaskId, boolean>;
  vigilance: number | null;
  sleepHours: number | null;
  recoveryMinutes: number | null;
  note: string;
  checkIns: CheckIn[];
}

export interface JournalEntry {
  id: string;
  createdAt: string;
  trigger: string;
  prediction: string;
  evidenceDanger: string;
  evidenceAlarm: string;
  response: string;
  recoveryMinutes: number | null;
  intensityBefore: number;
  intensityAfter: number;
}

export interface AppSettings {
  reducedMotion: boolean;
  compactMode: boolean;
  gentleReminders: boolean;
}

export interface AppState {
  version: 1;
  startedAt: string;
  activeWeek: WeekNumber;
  days: Record<string, DayRecord>;
  journal: JournalEntry[];
  settings: AppSettings;
}

export interface PlanWeek {
  number: WeekNumber;
  eyebrow: string;
  title: string;
  description: string;
  focusTask: string;
  outcome: string;
  accent: string;
  daily: string[];
  avoid: string[];
}
