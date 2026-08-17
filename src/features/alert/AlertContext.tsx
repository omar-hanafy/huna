import { createContext } from 'react';
import type { Sequence } from '../../content/schema';
import type { AlertEvent, AlertFlowState } from '../../core/alert-flow';
import type { LockoutState } from '../../core/safety-window';

export interface AlertContextValue {
  state: AlertFlowState;
  dispatch: (event: AlertEvent) => void;
  /** The sequence for the chosen state, already adapted to breathing preference. */
  sequence: Sequence | null;
  lockout: LockoutState;
  /** Records the safety check and ends the session. */
  finish: (action: string | null) => void;
  restart: () => void;
  ready: boolean;
}

export const AlertContext = createContext<AlertContextValue | null>(null);
