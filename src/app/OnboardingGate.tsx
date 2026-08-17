import { Navigate, Outlet } from 'react-router';
import { usePreferences } from '../storage/hooks';
import { useStorageContext } from '../storage/useStorage';

/**
 * Sends a first-time visitor through onboarding once.
 *
 * The gate waits for storage to be ready before deciding, so a slow IndexedDB
 * open cannot bounce a returning user back through setup they already did.
 */
export function OnboardingGate() {
  const { ready } = useStorageContext();
  const preferences = usePreferences();

  if (!ready || preferences === undefined) {
    return <div className="screen" aria-busy="true" />;
  }

  if (preferences.onboardingCompletedAt === null) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
