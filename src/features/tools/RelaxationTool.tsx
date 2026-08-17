import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './tools.css';

interface RelaxationToolProps {
  onComplete?: () => void;
}

const GROUPS = ['face', 'shoulders', 'hands', 'abdomen', 'legs'] as const;
const TENSE_SECONDS = 4;
const RELEASE_SECONDS = 9;

/**
 * Progressive muscle release.
 *
 * Wall-clock timed for the same reason as the breathing pacer. The release is
 * deliberately longer than the tension, and the copy repeats that any painful
 * area should be skipped rather than pushed through.
 */
export function RelaxationTool({ onComplete }: RelaxationToolProps) {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'tense' | 'release'>('tense');
  const [remaining, setRemaining] = useState(TENSE_SECONDS);
  const [complete, setComplete] = useState(false);
  const startedAt = useRef<number | null>(null);
  const notified = useRef(false);

  useEffect(() => {
    if (!running) return;
    const cycle = TENSE_SECONDS + RELEASE_SECONDS;
    const total = cycle * GROUPS.length;

    const tick = () => {
      if (startedAt.current === null) startedAt.current = performance.now();
      const elapsed = (performance.now() - startedAt.current) / 1000;

      if (elapsed >= total) {
        setRunning(false);
        setComplete(true);
        return;
      }

      const groupIndex = Math.floor(elapsed / cycle);
      const within = elapsed % cycle;
      setIndex(groupIndex);
      setPhase(within < TENSE_SECONDS ? 'tense' : 'release');
      setRemaining(Math.ceil(within < TENSE_SECONDS ? TENSE_SECONDS - within : cycle - within));
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (complete && !notified.current) {
      notified.current = true;
      onComplete?.();
    }
  }, [complete, onComplete]);

  const reset = () => {
    setRunning(false);
    setComplete(false);
    setIndex(0);
    setPhase('tense');
    setRemaining(TENSE_SECONDS);
    startedAt.current = null;
    notified.current = false;
  };

  const group = GROUPS[Math.min(index, GROUPS.length - 1)]!;

  return (
    <section className="tool">
      <div className="stack stack--tight">
        <h2>{t('tools.relaxation')}</h2>
        <p className="muted">{t('tools.relaxationHelper')}</p>
      </div>

      {complete ? (
        <p className="lede">{t('tools.relaxationDone')}</p>
      ) : (
        <div className="grounding-prompt">
          <p className="sequence-instruction__text">{t(`tools.muscleGroups.${group}`)}</p>
          <p className="muted">
            {phase === 'tense' ? t('tools.tenseNow') : t('tools.releaseNow')} · {remaining}
          </p>
        </div>
      )}

      <div className="progress-line" aria-hidden="true">
        <span style={{ inlineSize: `${((index + (complete ? 1 : 0)) / GROUPS.length) * 100}%` }} />
      </div>

      <div className="tool__controls">
        {running ? (
          <button type="button" className="button button--secondary" onClick={() => setRunning(false)}>
            {t('tools.pause')}
          </button>
        ) : (
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              if (complete) reset();
              startedAt.current = null;
              setRunning(true);
            }}
          >
            {complete ? t('tools.restart') : t('tools.start')}
          </button>
        )}
        <button type="button" className="button button--quiet" onClick={reset}>
          {t('tools.restart')}
        </button>
      </div>

      <p className="banner">{t('tools.relaxationCaution')}</p>
    </section>
  );
}
