import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlertFlow } from '../useAlertFlow';

const PRESET_KEYS = [
  'continueTask',
  'staySituation',
  'finishConversation',
  'walk',
  'water',
  'contact',
] as const;

/**
 * Return to Life.
 *
 * The screen that separates this from a relaxation app. It does not ask whether
 * the user feels calmer; it asks what they want to go back to. Success is
 * resuming an activity while still activated, not the activation reaching zero.
 *
 * "Nothing right now" is a first-class answer, recorded as a real choice and
 * excluded from the return-to-life denominator rather than counted as failure.
 */
export function ActionScreen() {
  const { t } = useTranslation();
  const { dispatch, finish } = useAlertFlow();
  const [custom, setCustom] = useState('');

  const choose = (action: string | null) => {
    finish(action);
    dispatch({ type: 'CHOOSE_ACTION', action });
  };

  return (
    <section className="screen screen--narrow alert-action">
      <div className="stack stack--tight">
        <h1>{t('alert.action.question')}</h1>
        <p className="muted">{t('alert.action.helper')}</p>
      </div>

      <div className="stack">
        {PRESET_KEYS.map((key) => {
          const label = t(`alert.action.options.${key}`);
          return (
            <button key={key} type="button" className="choice" onClick={() => choose(label)}>
              <span className="choice__title">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="field">
        <label htmlFor="custom-action">{t('alert.action.options.custom')}</label>
        <input
          id="custom-action"
          className="input"
          value={custom}
          placeholder={t('alert.action.customPlaceholder')}
          onChange={(event) => setCustom(event.target.value)}
        />
        <button
          type="button"
          className="button button--primary button--full"
          disabled={custom.trim().length === 0}
          onClick={() => choose(custom.trim())}
        >
          {t('common.next')}
        </button>
      </div>

      <button type="button" className="button button--quiet" onClick={() => choose(null)}>
        {t('alert.action.options.none')}
      </button>
    </section>
  );
}
