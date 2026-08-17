import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Offers a new version rather than imposing one.
 *
 * The service worker deliberately does not skip waiting, so a build cannot
 * reload someone mid-episode. This surfaces the update as a quiet, dismissible
 * choice; ignoring it simply means the new version arrives at the next cold
 * start.
 */
export function UpdateNotice() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-notice" role="status">
      <span>{t('app.updateAvailable')}</span>
      <button type="button" className="button button--quiet" onClick={() => void updateServiceWorker(true)}>
        {t('app.updateNow')}
      </button>
      <button type="button" className="button button--quiet" onClick={() => setNeedRefresh(false)}>
        {t('common.notNow')}
      </button>
    </div>
  );
}
