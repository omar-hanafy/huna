import { useEffect, useState } from 'react';
import { msUntilNextLocalMidnight, toDateKey, type DateKey } from './date';

/**
 * Today's date key, which actually rolls over at midnight.
 *
 * The old app computed this once per render, so an app left open overnight kept
 * writing to yesterday's record (defect 6). A habit tracker being wrong about
 * which day it is undermines everything built on top of it.
 *
 * The timer is re-armed after each rollover rather than set on an interval, so
 * it stays accurate across daylight saving changes.
 */
export function useToday(): DateKey {
  const [today, setToday] = useState<DateKey>(() => toDateKey(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      // A one second cushion so the timer never fires a hair before midnight
      // and computes the previous day again.
      timer = setTimeout(
        () => {
          setToday(toDateKey(new Date()));
          schedule();
        },
        msUntilNextLocalMidnight(new Date()) + 1000,
      );
    };

    // A device waking from sleep will not have run the timer; re-check on focus.
    const recheck = () => setToday(toDateKey(new Date()));

    schedule();
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, []);

  return today;
}
