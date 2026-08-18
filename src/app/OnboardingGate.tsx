import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import { usePreferences } from '../storage/hooks';
import { useStorageContext } from '../storage/useStorage';

/**
 * Sends a first-time visitor through onboarding once.
 *
 * The gate waits for storage to be ready before deciding, so a slow IndexedDB
 * open cannot bounce a returning user back through setup they already did.
 *
 * Two exceptions keep the app honest about what it is for:
 *
 * - The alert flow is never gated. Someone whose first contact with the app is
 *   an episode reaches the sequences immediately, and onboarding waits.
 * - When storage cannot be read at all, preferences never arrive, so the busy
 *   screen would spin forever. Say what happened instead, and still leave the
 *   alert flow reachable.
 */
export function OnboardingGate() {
  const { t } = useTranslation();
  const { ready, problem } = useStorageContext();
  const preferences = usePreferences();
  const { pathname } = useLocation();

  // The alert flow and the safety plan it links to. Someone whose first contact
  // with the app is an episode must not be bounced into setup by the one link
  // the danger screen offers them.
  const isAlert = pathname.startsWith('/alert') || pathname.startsWith('/card');

  if (!ready || preferences === undefined) {
    if (isAlert && ready) return <Outlet />;
    if (problem) {
      return (
        <div className="screen screen--narrow stack">
          <div className="storage-banner" role="alert">
            {problem === 'quota' ? t('settings.storageFull') : t('settings.storageUnavailable')}
          </div>
          <p className="lede">{t('app.tagline')}</p>
          <a className="button button--primary button--full" href="#/alert">
            {t('home.alertButton')}
          </a>
        </div>
      );
    }
    return <div className="screen" aria-busy="true" />;
  }

  if (preferences.onboardingCompletedAt === null && !isAlert) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
