import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './tools.css';

interface GroundingToolProps {
  onComplete?: () => void;
}

const SENSES = [
  { key: 'see', count: 5 },
  { key: 'touch', count: 4 },
  { key: 'hear', count: 3 },
  { key: 'smell', count: 2 },
  { key: 'taste', count: 1 },
] as const;

/**
 * The 5-4-3-2-1 senses exercise.
 *
 * Counting is done by tapping, not typing. During a surge, a text field is a
 * demand rather than an aid, so noticing is registered with a tap and the
 * optional note stays optional. Eyes stay open throughout; that is stated in
 * the copy rather than assumed.
 */
export function GroundingTool({ onComplete }: GroundingToolProps) {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [complete, setComplete] = useState(false);

  const step = SENSES[Math.min(stepIndex, SENSES.length - 1)]!;
  const noticed = counts[step.key] ?? 0;
  const totalNeeded = SENSES.reduce((sum, sense) => sum + sense.count, 0);
  const totalNoticed = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const notice = () => {
    const next = Math.min(noticed + 1, step.count);
    setCounts((current) => ({ ...current, [step.key]: next }));

    if (next === step.count) {
      if (stepIndex < SENSES.length - 1) setStepIndex(stepIndex + 1);
      else {
        setComplete(true);
        onComplete?.();
      }
    }
  };

  const reset = () => {
    setCounts({});
    setStepIndex(0);
    setComplete(false);
  };

  if (complete) {
    return (
      <section className="tool">
        <h2>{t('tools.groundingDoneTitle')}</h2>
        <p className="lede">{t('tools.groundingDoneBody')}</p>
        <button type="button" className="button button--secondary" onClick={reset}>
          {t('tools.restart')}
        </button>
      </section>
    );
  }

  return (
    <section className="tool">
      <div className="stack stack--tight">
        <h2>{t('tools.grounding')}</h2>
        <p className="muted">{t('tools.groundingHelper')}</p>
      </div>

      <div className="progress-line" aria-hidden="true">
        <span style={{ inlineSize: `${(totalNoticed / totalNeeded) * 100}%` }} />
      </div>

      <div className="grounding-prompt">
        <p className="sequence-instruction__text">{t(`tools.senses.${step.key}`, { count: step.count })}</p>
        <p className="muted">{t(`tools.senseHints.${step.key}`)}</p>
      </div>

      <div
        className="grounding-dots"
        aria-label={t('tools.noticedCount', { done: noticed, total: step.count })}
      >
        {Array.from({ length: step.count }, (_, index) => (
          <span key={index} className={index < noticed ? 'is-filled' : ''} />
        ))}
      </div>

      <button type="button" className="button button--primary button--full" onClick={notice}>
        {t('tools.noticedOne')}
      </button>
      <button type="button" className="button button--quiet" onClick={reset}>
        {t('tools.restart')}
      </button>
    </section>
  );
}
