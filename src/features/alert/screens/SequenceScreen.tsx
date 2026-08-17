import { useTranslation } from 'react-i18next';
import { useAlertFlow } from '../useAlertFlow';

/**
 * One instruction per screen.
 *
 * No decorative background, no illustration, no character, and no countdown.
 * The suggested duration in the content is not enforced: nobody is pushed off a
 * step by a timer, and there is always a way out that is not framed as quitting.
 */
export function SequenceScreen() {
  const { t } = useTranslation();
  const { state, dispatch, sequence } = useAlertFlow();

  if (!sequence) return null;

  const total = sequence.steps.length;
  const index = Math.min(state.stepIndex, total - 1);
  const step = sequence.steps[index];
  if (!step) return null;

  const isLast = index === total - 1;

  return (
    <section className="screen screen--narrow alert-sequence">
      <div className="stack stack--tight">
        <span className="step-count">{t('common.stepOf', { current: index + 1, total })}</span>
        <div className="progress-line" aria-hidden="true">
          <span style={{ inlineSize: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className="sequence-instruction">
        <p className="sequence-instruction__text">{step.text}</p>
        {step.hint ? <p className="muted">{step.hint}</p> : null}
      </div>

      <div className="stack">
        <button
          type="button"
          className="button button--primary button--full"
          onClick={() => dispatch({ type: 'NEXT_SEQUENCE_STEP', stepCount: total })}
        >
          {isLast ? t('alert.sequence.finish') : t('alert.sequence.next')}
        </button>

        <div className="sequence-secondary">
          <button
            type="button"
            className="button button--quiet"
            onClick={() => dispatch({ type: 'PREVIOUS_SEQUENCE_STEP' })}
            disabled={index === 0}
          >
            {t('common.back')}
          </button>
          {/* Leaving early is a legitimate choice, not a failure to finish. */}
          <button
            type="button"
            className="button button--quiet"
            onClick={() => dispatch({ type: 'CHOOSE_STATE', stateId: 'unsure' })}
          >
            {t('alert.sequence.tooMuch')}
          </button>
        </div>
      </div>
    </section>
  );
}
