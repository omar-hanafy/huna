import { useTranslation } from 'react-i18next';
import { formatTime } from '../../../lib/date';
import { useAlertFlow } from '../useAlertFlow';

/**
 * The check-once seal.
 *
 * Shown after an explicit "no" to confirm the check was recorded, and shown
 * ahead of the question when another check was logged very recently.
 *
 * The two choices are the whole point. The app cannot see the room, so it must
 * not decide whether checking again is warranted; it can only say what it knows
 * (you checked, this long ago) and let the user answer. Neither choice is
 * styled as the correct one, and neither is disabled.
 */
export function SealScreen() {
  const { t, i18n } = useTranslation();
  const { state, dispatch, lockout } = useAlertFlow();

  const reentry = state.sealVariant === 're-entry';
  const check = lockout.lastCheck;

  return (
    <section className="screen screen--narrow alert-seal">
      <div className="stack stack--tight">
        <span className="eyebrow">{t('alert.seal.title')}</span>
        <h1>{t('alert.seal.body')}</h1>
        {reentry && check ? (
          <p className="muted">
            {t('alert.seal.checkedAt', {
              time: formatTime(check.at, i18n.language),
              minutes: lockout.minutesAgo ?? 0,
            })}
          </p>
        ) : null}
      </div>

      <div className="stack">
        <button type="button" className="choice" onClick={() => dispatch({ type: 'SEAL_CONTINUE' })}>
          <span className="choice__title">{t('alert.seal.nothingChanged')}</span>
        </button>
        <button type="button" className="choice" onClick={() => dispatch({ type: 'SEAL_RECHECK' })}>
          <span className="choice__title">{t('alert.seal.somethingChanged')}</span>
        </button>
      </div>

      <p className="muted">{t('alert.seal.neverBlocked')}</p>
    </section>
  );
}
