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
 *
 * Pause keeps the elapsed time. It used to discard it, so pausing at the legs
 * and resuming started again at the face - a quiet punishment for stopping.
 */
export function RelaxationTool({ onComplete }: RelaxationToolProps) {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'tense' | 'release'>('tense');
  const [remaining, setRemaining] = useState(TENSE_SECONDS);
  const [complete, setComplete] = useState(false);
  const [started, setStarted] = useState(false);
  const startedAt = useRef<number | null>(null);
  const elapsedBeforePause = useRef(0);
  const notified = useRef(false);

  useEffect(() => {
    if (!running) return;
    const cycle = TENSE_SECONDS + RELEASE_SECONDS;
    const total = cycle * GROUPS.length;

    const tick = () => {
      const now = performance.now();
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = elapsedBeforePause.current + (now - startedAt.current) / 1000;

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
    setStarted(false);
    setIndex(0);
    setPhase('tense');
    setRemaining(TENSE_SECONDS);
    startedAt.current = null;
    elapsedBeforePause.current = 0;
    notified.current = false;
  };

  const pause = () => {
    if (startedAt.current !== null) {
      elapsedBeforePause.current += (performance.now() - startedAt.current) / 1000;
      startedAt.current = null;
    }
    setRunning(false);
  };

  const start = () => {
    if (complete) reset();
    startedAt.current = null;
    setStarted(true);
    setRunning(true);
  };

  const group = GROUPS[Math.min(index, GROUPS.length - 1)]!;

  return (
    <section className="tool">
      <div className="stack stack--tight">
        <h2>{t('tools.relaxation')}</h2>
        <p className="muted">{t('tools.relaxationHelper')}</p>
      </div>

      {complete ? (
        <p className="lede" role="status">
          {t('tools.relaxationDone')}
        </p>
      ) : (
        <div className="grounding-prompt">
          <p className="sequence-instruction__text">{t(`tools.muscleGroups.${group}`)}</p>
          <p className="muted">
            {phase === 'tense' ? t('tools.tenseNow') : t('tools.releaseNow')} · {remaining}
          </p>
          {/* Announced in place of the two lines above: the group and what to
              do with it change rarely, the seconds change constantly and would
              talk over everything else. */}
          <p className="sr-only" aria-live="polite">
            {`${t(`tools.muscleGroups.${group}`)} · ${phase === 'tense' ? t('tools.tenseNow') : t('tools.releaseNow')}`}
          </p>
        </div>
      )}

      <div className="progress-line" aria-hidden="true">
        <span style={{ inlineSize: `${((index + (complete ? 1 : 0)) / GROUPS.length) * 100}%` }} />
      </div>

      <div className="tool__controls">
        {running ? (
          <button type="button" className="button button--secondary" onClick={pause}>
            {t('tools.pause')}
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={start}>
            {complete ? t('tools.restart') : started ? t('tools.resume') : t('tools.start')}
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
