import { CORE_TASK_IDS, type CoreTaskId, type DayRecord, type UserPreferences } from '../storage/types';

/** The shortened list a "busy day" asks for: the four that hold the routine together. */
const BUSY_DAY_TASKS: CoreTaskId[] = ['orientation', 'breathing', 'movement', 'checkins'];

/**
 * Which tasks today actually asks for.
 *
 * Lives in core because two screens show the same count and they must agree:
 * Home used to hardcode a total of six while Today listed three, so the same
 * routine read as "1 of 6" in one place and "1 of 3" in the other.
 *
 * `worsens` removes breath work from the list entirely rather than leaving an
 * item the user is expected to skip every day.
 */
export function visibleTaskIds(busyDay: boolean, breathingHidden: boolean): CoreTaskId[] {
  const base = busyDay ? BUSY_DAY_TASKS : [...CORE_TASK_IDS];
  return base.filter((task) => !(task === 'breathing' && breathingHidden));
}

export interface TaskProgress {
  tasks: CoreTaskId[];
  done: number;
  total: number;
}

export function taskProgress(
  day: Pick<DayRecord, 'busyDay' | 'tasks'> | null | undefined,
  preferences: Pick<UserPreferences, 'breathing'> | undefined,
): TaskProgress {
  const tasks = visibleTaskIds(day?.busyDay ?? false, preferences?.breathing === 'worsens');
  const done = day ? tasks.filter((task) => day.tasks[task]).length : 0;
  return { tasks, done, total: tasks.length };
}
