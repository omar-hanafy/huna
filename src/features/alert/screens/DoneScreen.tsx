import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAlertFlow } from '../useAlertFlow';

/**
 * Quiet completion.
 *
 * No celebration, no confetti, no score. The message is that the session is
 * over and the user should leave, because the product succeeds when they go
 * back to their life rather than when they stay here.
 */
export function DoneScreen() {
  const { t } = useTranslation();
  const { state } = useAlertFlow();

  // "Nothing right now" is a real answer, so the closing copy must not thank
  // the user for a next step they deliberately declined to pick.
  const declined = state.actionChosen && state.chosenAction === null;

  return (
    <section className="screen screen--narrow alert-done">
      <div className="stack stack--tight">
        <h1>{declined ? t('alert.done.titleNoAction') : t('alert.done.title')}</h1>
        <p className="lede">{declined ? t('alert.done.bodyNoAction') : t('alert.done.body')}</p>
      </div>

      {state.chosenAction ? (
        <div className="card card--calm">
          <span className="eyebrow">{t('alert.action.question')}</span>
          <p className="choice__title">{state.chosenAction}</p>
        </div>
      ) : null}

      <Link className="button button--secondary button--full" to="/">
        {t('nav.home')}
      </Link>
    </section>
  );
}
