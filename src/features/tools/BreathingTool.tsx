import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './tools.css';

interface BreathingToolProps {
  onComplete?: () => void;
  reducedMotion?: boolean;
}

type Phase = 'idle' | 'inhale' | 'exhale' | 'complete';

const INHALE_OPTIONS = [3, 4, 5];
const EXHALE_OPTIONS = [4, 5, 6, 7, 8];
const CYCLE_OPTIONS = [6, 10, 15, 20];

/**
 * Paced breathing.
 *
 * Timing is derived from the wall clock rather than counted with a chain of
 * one-second timeouts. The old implementation drifted, and stalled outright
 * when the tab was backgrounded, so a session advertised as ten cycles was
 * neither ten cycles nor the stated duration (defect 7). Here the elapsed time
 * is measured, so pausing, backgrounding, and slow frames are all harmless.
 *
 * The orb never pulses on its own. Under reduced motion it does not animate at
 * all and the countdown carries the pacing instead.
 */
export function BreathingTool({ onComplete, reducedMotion = false }: BreathingToolProps) {
  const { t } = useTranslation();

  const [inhale, setInhale] = useState(4);
  const [exhale, setExhale] = useState(6);
  const [targetCycles, setTargetCycles] = useState(10);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(inhale);
  const [completedCycles, setCompletedCycles] = useState(0);

  const startedAt = useRef<number | null>(null);
  const elapsedBeforePause = useRef(0);
  const notified = useRef(false);

  const cycleSeconds = inhale + exhale;
  const totalSeconds = cycleSeconds * targetCycles;

  const resetWith = useCallback((nextInhale: number) => {
    setRunning(false);
    setPhase('idle');
    setRemaining(nextInhale);
    setCompletedCycles(0);
    startedAt.current = null;
    elapsedBeforePause.current = 0;
    notified.current = false;
  }, []);

  const reset = useCallback(() => resetWith(inhale), [resetWith, inhale]);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      const now = performance.now();
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = elapsedBeforePause.current + (now - startedAt.current) / 1000;

      if (elapsed >= totalSeconds) {
        setPhase('complete');
        setCompletedCycles(targetCycles);
        setRemaining(0);
        setRunning(false);
        return;
      }

      const withinCycle = elapsed % cycleSeconds;
      const inInhale = withinCycle < inhale;
      setPhase(inInhale ? 'inhale' : 'exhale');
      setRemaining(Math.ceil(inInhale ? inhale - withinCycle : cycleSeconds - withinCycle));
      setCompletedCycles(Math.floor(elapsed / cycleSeconds));
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [running, cycleSeconds, inhale, totalSeconds, targetCycles]);

  useEffect(() => {
    if (phase === 'complete' && !notified.current) {
      notified.current = true;
      onComplete?.();
    }
  }, [phase, onComplete]);

  const start = () => {
    if (phase === 'idle' || phase === 'complete') {
      elapsedBeforePause.current = 0;
      setCompletedCycles(0);
      notified.current = false;
    }
    startedAt.current = null;
    setRunning(true);
  };

  const pause = () => {
    if (startedAt.current !== null) {
      elapsedBeforePause.current += (performance.now() - startedAt.current) / 1000;
      startedAt.current = null;
    }
    setRunning(false);
  };

  const label =
    phase === 'inhale'
      ? t('tools.breathingIn')
      : phase === 'exhale'
        ? t('tools.breathingOut')
        : phase === 'complete'
          ? t('tools.breathingDone')
          : t('tools.breathingReady');

  const progress = Math.min(100, (completedCycles / targetCycles) * 100);

  return (
    <section className="tool">
      <div className="stack stack--tight">
        <h2>{t('tools.breathing')}</h2>
        <p className="muted">{t('tools.breathingHelper')}</p>
      </div>

      <div className={`breath-orb ${running && !reducedMotion ? `is-${phase}` : ''}`}>
        <div
          className="breath-orb__core"
          style={{ '--phase-seconds': `${phase === 'inhale' ? inhale : exhale}s` } as React.CSSProperties}
        >
          {/*
            The countdown is not announced: a screen reader reciting a new
            number every second buries the instruction. The phase label is the
            part worth hearing, and it changes only when the breath does.
          */}
          <strong aria-hidden="true">{phase === 'idle' ? '' : phase === 'complete' ? '✓' : remaining}</strong>
          <span aria-live="polite">{label}</span>
        </div>
      </div>

      <div className="progress-line" aria-hidden="true">
        <span style={{ inlineSize: `${progress}%` }} />
      </div>
      <p className="step-count">
        {t('tools.cycleCount', { done: Math.min(completedCycles, targetCycles), total: targetCycles })}
      </p>

      <div className="tool__controls">
        {running ? (
          <button type="button" className="button button--secondary" onClick={pause}>
            {t('tools.pause')}
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={start}>
            {phase === 'idle' || phase === 'complete' ? t('tools.start') : t('tools.resume')}
          </button>
        )}
        <button type="button" className="button button--quiet" onClick={reset}>
          {t('tools.restart')}
        </button>
      </div>

      {/*
        Changing the rhythm restarts the session rather than reinterpreting the
        time already spent: shrinking a paused twenty-cycle session to six used
        to jump straight to "done" without a single breath being taken.
      */}
      <details className="tool__settings">
        <summary>{t('tools.adjustRhythm')}</summary>
        <div className="tool__settings-grid">
          <label className="field">
            <span className="field__label">{t('tools.inhale')}</span>
            <select
              className="select"
              value={inhale}
              disabled={running}
              onChange={(e) => {
                const value = Number(e.target.value);
                setInhale(value);
                resetWith(value);
              }}
            >
              {INHALE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">{t('tools.exhale')}</span>
            <select
              className="select"
              value={exhale}
              disabled={running}
              onChange={(e) => {
                setExhale(Number(e.target.value));
                resetWith(inhale);
              }}
            >
              {EXHALE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">{t('tools.cycles')}</span>
            <select
              className="select"
              value={targetCycles}
              disabled={running}
              onChange={(e) => {
                setTargetCycles(Number(e.target.value));
                resetWith(inhale);
              }}
            >
              {CYCLE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      <p className="banner">{t('tools.breathingCaution')}</p>
    </section>
  );
}
