import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTENT, type Locale } from '../../content';
import {
  alertFlowReducer,
  resumeFrom,
  startAlertFlow,
  toSession,
  type AlertEvent,
  type AlertFlowState,
} from '../../core/alert-flow';
import { selectSequence } from '../../core/exercise-selector';
import { lockoutState, type LockoutState } from '../../core/safety-window';
import { createId } from '../../lib/id';
import { useNow } from '../../lib/useNow';
import { useLastSafetyCheck, usePreferences, useWrite } from '../../storage/hooks';
import { useStorage } from '../../storage/useStorage';
import type { AlertSession } from '../../storage/types';
import { AlertContext, type AlertContextValue } from './AlertContext';

const EMPTY_LOCKOUT: LockoutState = { active: false, minutesAgo: null, lastCheck: null };

function blankSession(id: string, startedAt: string): AlertSession {
  return {
    id,
    startedAt,
    endedAt: null,
    safetyAnswer: null,
    stateId: null,
    activationBefore: null,
    activationAfter: null,
    chosenAction: null,
    actionCompleted: null,
    whatHelped: null,
    followUpMissed: false,
    followUpAnsweredAt: null,
  };
}

/**
 * Owns one alert session: its state machine, its persistence, and its resume.
 *
 * The session is written on every transition rather than only at the end,
 * because the user may close the app mid-episode and the fact that the episode
 * happened is itself the record worth keeping.
 *
 * State is held in `useState` rather than `useReducer` so that bootstrap and
 * restart can replace it wholesale without inventing a reducer event that only
 * exists to serve React.
 */
export function AlertProvider({ children }: { children: ReactNode }) {
  const preferences = usePreferences();
  const lastCheck = useLastSafetyCheck();
  const storage = useStorage();
  const write = useWrite();
  const { i18n } = useTranslation();
  const now = useNow(60_000);

  const [state, setState] = useState<AlertFlowState>(() =>
    startAlertFlow({ sessionId: createId(), startedAt: new Date().toISOString(), lockoutActive: false }),
  );
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<AlertSession>(blankSession(state.sessionId, state.startedAt));
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current || preferences === undefined || lastCheck === undefined) return;
    bootstrapped.current = true;
    let cancelled = false;

    void (async () => {
      const open = await storage.getOpenAlertSession();

      const lockout = lockoutState(lastCheck, new Date(), preferences.lockoutMinutes);

      if (!cancelled && open) {
        // A session left open means the app closed mid-episode. Pick it up
        // where it was, unless a check was logged very recently and grounding
        // has not started, in which case the reminder comes first.
        sessionRef.current = open;
        setState(resumeFrom(open, lockout.active));
      } else if (!cancelled) {
        const fresh = startAlertFlow({
          sessionId: createId(),
          startedAt: new Date().toISOString(),
          lockoutActive: lockout.active,
        });
        sessionRef.current = blankSession(fresh.sessionId, fresh.startedAt);
        setState(fresh);
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [preferences, lastCheck, storage]);

  const lockout = useMemo(
    () =>
      preferences && lastCheck !== undefined
        ? lockoutState(lastCheck, now, preferences.lockoutMinutes)
        : EMPTY_LOCKOUT,
    [preferences, lastCheck, now],
  );

  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';

  const sequence = useMemo(() => {
    if (!state.stateId || !preferences) return null;
    return selectSequence(CONTENT[locale].sequences, state.stateId, preferences.breathing);
  }, [state.stateId, preferences, locale]);

  const persist = useCallback(
    (next: AlertFlowState) => {
      const session = toSession(next, sessionRef.current);
      sessionRef.current = session;
      void write((instance) => instance.saveAlertSession(session));
    },
    [write],
  );

  const dispatch = useCallback(
    (event: AlertEvent) => {
      setState((current) => {
        const next = alertFlowReducer(current, event);
        if (next !== current) persist(next);

        // Answering "no" is the moment the check is recorded. It is what the
        // seal timestamps, and what the reminder window measures from.
        if (event.type === 'ANSWER_SAFETY' && event.answer === 'no') {
          void write((instance) =>
            instance.saveSafetyCheck({
              id: createId(),
              at: new Date().toISOString(),
              target: 'alert',
              source: 'alert',
            }),
          );
        }
        return next;
      });
    },
    [persist, write],
  );

  const finish = useCallback(
    (action: string | null) => {
      const ended: AlertSession = {
        ...toSession(state, sessionRef.current),
        chosenAction: action,
        endedAt: new Date().toISOString(),
      };
      sessionRef.current = ended;
      void write((instance) => instance.saveAlertSession(ended));
    },
    [state, write],
  );

  const restart = useCallback(() => {
    const fresh = startAlertFlow({
      sessionId: createId(),
      startedAt: new Date().toISOString(),
      lockoutActive: false,
    });
    sessionRef.current = blankSession(fresh.sessionId, fresh.startedAt);
    setState(fresh);
  }, []);

  const value = useMemo<AlertContextValue>(
    () => ({ state, dispatch, sequence, lockout, finish, restart, ready }),
    [state, dispatch, sequence, lockout, finish, restart, ready],
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}
