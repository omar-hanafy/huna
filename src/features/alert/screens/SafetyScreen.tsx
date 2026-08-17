import { useTranslation } from 'react-i18next';
import type { SafetyAnswer } from '../../../storage/types';
import { useAlertFlow } from '../useAlertFlow';

/**
 * The safety check.
 *
 * Deliberately plain: no illustration, no accent colour, no decoration. This is
 * the one screen in the app where the user is being asked to look at their
 * actual surroundings rather than at a design.
 *
 * All three answers are equally weighted. "Not sure" is not a lesser option, and
 * it does not continue to grounding: the app cannot resolve the uncertainty, so
 * it routes outward exactly as "yes" does.
 */
export function SafetyScreen() {
  const { t } = useTranslation();
  const { dispatch } = useAlertFlow();

  const answer = (value: SafetyAnswer) => dispatch({ type: 'ANSWER_SAFETY', answer: value });

  return (
    <section className="screen screen--narrow alert-safety">
      <div className="stack--tight stack">
        <h1>{t('alert.safety.question')}</h1>
        <p className="muted">{t('alert.safety.helper')}</p>
      </div>

      <div className="stack" role="group" aria-label={t('alert.safety.question')}>
        <button type="button" className="choice" onClick={() => answer('yes')}>
          <span className="choice__title">{t('alert.safety.yes')}</span>
        </button>
        <button type="button" className="choice" onClick={() => answer('no')}>
          <span className="choice__title">{t('alert.safety.no')}</span>
        </button>
        <button type="button" className="choice" onClick={() => answer('unsure')}>
          <span className="choice__title">{t('alert.safety.unsure')}</span>
        </button>
      </div>
    </section>
  );
}
