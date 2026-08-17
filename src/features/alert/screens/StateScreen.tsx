import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivationSlider } from '../../../components/ActivationSlider';
import { CONTENT, type Locale } from '../../../content';
import { StateIcon } from '../../../components/icons/StateIcon';
import { useAlertFlow } from '../useAlertFlow';

/**
 * "What feels strongest right now?"
 *
 * The product's central departure from a tool library: the user reports a state
 * and receives one short sequence, rather than choosing between exercises while
 * their concentration is poor.
 */
export function StateScreen() {
  const { t, i18n } = useTranslation();
  const { dispatch } = useAlertFlow();
  const [activation, setActivation] = useState(5);

  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const sequences = CONTENT[locale].sequences.sequences;

  const choose = (stateId: (typeof sequences)[number]['id']) => {
    dispatch({ type: 'SET_ACTIVATION_BEFORE', value: activation });
    dispatch({ type: 'CHOOSE_STATE', stateId });
  };

  return (
    <section className="screen alert-state">
      <div className="stack stack--tight">
        <h1>{t('alert.state.question')}</h1>
        <p className="muted">{t('alert.state.helper')}</p>
      </div>

      <div className="card card--calm">
        <ActivationSlider
          id="activation-before"
          label={t('alert.activationBefore')}
          value={activation}
          onChange={setActivation}
        />
      </div>

      <div className="state-grid">
        {sequences.map((sequence) => (
          <button
            key={sequence.id}
            type="button"
            className="choice state-card"
            onClick={() => choose(sequence.id)}
          >
            <StateIcon state={sequence.id} size={48} />
            <span className="stack stack--tight">
              <span className="choice__title">{sequence.title}</span>
              <span className="choice__hint">{sequence.subtitle}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
