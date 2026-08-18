import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { acceptUpdate, dismissUpdate, startUpdateWatcher, subscribeToUpdates } from './updateWatcher';
import './UpdateNotice.css';

/**
 * Offers a new version rather than imposing one.
 *
 * The service worker deliberately does not skip waiting, so a build cannot
 * reload someone mid-episode. This surfaces the update as a quiet, dismissible
 * choice; ignoring it simply means the new version arrives at the next cold
 * start.
 *
 * Two details are deliberate:
 *
 * - The banner never appears on an alert route. Someone in the middle of an
 *   episode should not be asked to make a software decision.
 * - Registration and the reload decision live in `updateWatcher`, not here, so
 *   the worker registers on every entry point and only the tab that accepted
 *   the update reloads.
 */
export function UpdateNotice() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    startUpdateWatcher();
    return subscribeToUpdates(setNeedRefresh);
  }, []);

  if (!needRefresh || pathname.startsWith('/alert')) return null;

  return (
    <div className="update-notice" role="status">
      <span>{t('app.updateAvailable')}</span>
      <button type="button" className="button button--quiet" onClick={acceptUpdate}>
        {t('app.updateNow')}
      </button>
      <button type="button" className="button button--quiet" onClick={dismissUpdate}>
        {t('common.notNow')}
      </button>
    </div>
  );
}
