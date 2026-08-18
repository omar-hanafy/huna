import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { routeForStep } from '../../core/alert-flow';
import { AlertProvider } from './AlertProvider';
import { ActionScreen } from './screens/ActionScreen';
import { DangerScreen } from './screens/DangerScreen';
import { DoneScreen } from './screens/DoneScreen';
import { SafetyScreen } from './screens/SafetyScreen';
import { SealScreen } from './screens/SealScreen';
import { SequenceScreen } from './screens/SequenceScreen';
import { StateScreen } from './screens/StateScreen';
import { useAlertFlow } from './useAlertFlow';
import './alert.css';

/**
 * Keeps the URL in step with the flow.
 *
 * The flow state is the single source of truth; the URL follows it. That way a
 * refresh resumes from the persisted session rather than from whatever path the
 * browser happened to be on, and the back button cannot drop the user into a
 * step the state machine never entered.
 */
function AlertSteps() {
  const { state, ready } = useAlertFlow();
  const navigate = useNavigate();
  const location = useLocation();

  const target = routeForStep(state.step);

  useEffect(() => {
    if (!ready) return;
    if (location.pathname !== target) void navigate(target, { replace: true });
  }, [ready, target, location.pathname, navigate]);

  /**
   * Each step moves focus to its own heading.
   *
   * A hash-router navigation leaves focus wherever the last button was, so a
   * screen reader kept announcing the old screen while a new one was on
   * display. The sequence screen focuses its own instruction, so nothing
   * happens here when it has no heading of its own.
   *
   * The first step is deliberately exempt: on a fresh open the page already
   * starts at the top, and grabbing focus then would yank it away from someone
   * who has already started tabbing.
   */
  const lastStep = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const previous = lastStep.current;
    lastStep.current = state.step;
    if (previous === null || previous === state.step) return;

    const heading = document.querySelector<HTMLElement>('.screen h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [ready, state.step]);

  if (!ready) return <div className="screen" aria-busy="true" />;

  switch (state.step) {
    case 'safety':
      return <SafetyScreen />;
    case 'danger':
      return <DangerScreen />;
    case 'seal':
      return <SealScreen />;
    case 'state':
      return <StateScreen />;
    case 'sequence':
      return <SequenceScreen />;
    case 'action':
      return <ActionScreen />;
    case 'done':
      return <DoneScreen />;
    default:
      return <SafetyScreen />;
  }
}

export function AlertRoute() {
  return (
    <AlertProvider>
      <AlertSteps />
    </AlertProvider>
  );
}
