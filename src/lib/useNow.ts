import { useEffect, useState } from 'react';

/**
 * The current time, as state that actually advances.
 *
 * Reading the clock during render makes a component non-idempotent: two renders
 * with the same props produce different output, and React's purity rules reject
 * it. It is also simply wrong for this app. The seal says "you checked N
 * minutes ago" and the follow-up window opens five minutes after a session, so
 * a value frozen at the last incidental re-render would quietly lie.
 *
 * Also re-reads on focus and on visibility change, because a phone waking from
 * sleep will not have run the interval.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, intervalMs);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);

  return now;
}
