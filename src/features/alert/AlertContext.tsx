import { createContext } from 'react';
import type { Sequence } from '../../content/schema';
import type { AlertEvent, AlertFlowState } from '../../core/alert-flow';
import type { LockoutState } from '../../core/safety-window';
import type { UserPreferences } from '../../storage/types';

export interface AlertContextValue {
  state: AlertFlowState;
  dispatch: (event: AlertEvent) => void;
  /** The sequence for the chosen state, already adapted to breathing preference. */
  sequence: Sequence | null;
  /**
   * The preferences the flow is running on, defaults included.
   *
   * Screens read them from here rather than from storage directly, so that a
   * browser with IndexedDB blocked still shows the safety screen instead of
   * waiting forever for preferences that will never arrive.
   */
  preferences: UserPreferences;
  lockout: LockoutState;
  /** Records the safety check and ends the session. */
  finish: (action: string | null) => void;
  restart: () => void;
  ready: boolean;
}

export const AlertContext = createContext<AlertContextValue | null>(null);
