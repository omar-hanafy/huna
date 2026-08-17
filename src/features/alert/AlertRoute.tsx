import { useEffect } from 'react';
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
