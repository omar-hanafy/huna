import { useEffect, useRef } from 'react';
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
  const instruction = useRef<HTMLParagraphElement>(null);

  const total = sequence ? sequence.steps.length : 0;
  const index = total > 0 ? Math.min(state.stepIndex, total - 1) : 0;

  // The new instruction takes focus, so a screen reader reads the step the user
  // just moved to instead of leaving them on a button that no longer describes
  // what is on screen.
  useEffect(() => {
    instruction.current?.focus({ preventScroll: true });
  }, [index]);

  if (!sequence) return null;

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
        <p className="sequence-instruction__text" ref={instruction} tabIndex={-1}>
          {step.text}
        </p>
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
          {/*
            Leaving this exercise is a legitimate choice, not a failure to
            finish. It returns to the picker: sending everyone to one fixed
            sequence did nothing at all when they were already in that one.
          */}
          <button
            type="button"
            className="button button--quiet"
            onClick={() => dispatch({ type: 'CHANGE_EXERCISE' })}
          >
            {t('alert.sequence.tooMuch')}
          </button>
        </div>
      </div>
    </section>
  );
}
