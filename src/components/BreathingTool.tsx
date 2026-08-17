import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from './Icon';

type Phase = 'idle' | 'inhale' | 'exhale' | 'complete';

interface BreathingToolProps {
  reducedMotion?: boolean;
  onComplete?: () => void;
}

export function BreathingTool({ reducedMotion = false, onComplete }: BreathingToolProps) {
  const [inhaleSeconds, setInhaleSeconds] = useState(4);
  const [exhaleSeconds, setExhaleSeconds] = useState(6);
  const [targetCycles, setTargetCycles] = useState(10);
  const [phase, setPhase] = useState<Phase>('idle');
  const [phaseRemaining, setPhaseRemaining] = useState(inhaleSeconds);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const completionSent = useRef(false);

  const progress = useMemo(() => {
    if (phase === 'complete') return 100;
    if (targetCycles === 0) return 0;
    const phaseFraction =
      phase === 'inhale'
        ? (inhaleSeconds - phaseRemaining) / (inhaleSeconds + exhaleSeconds)
        : phase === 'exhale'
          ? (inhaleSeconds + exhaleSeconds - phaseRemaining) / (inhaleSeconds + exhaleSeconds)
          : 0;
    return Math.min(100, ((completedCycles + phaseFraction) / targetCycles) * 100);
  }, [completedCycles, exhaleSeconds, inhaleSeconds, phase, phaseRemaining, targetCycles]);

  useEffect(() => {
    if (!running || phase === 'idle' || phase === 'complete') return;

    timerRef.current = window.setTimeout(() => {
      if (phaseRemaining > 1) {
        setPhaseRemaining(phaseRemaining - 1);
        return;
      }

      if (phase === 'inhale') {
        setPhase('exhale');
        setPhaseRemaining(exhaleSeconds);
        return;
      }

      const nextCycle = completedCycles + 1;
      setCompletedCycles(nextCycle);
      if (nextCycle >= targetCycles) {
        setPhase('complete');
        setRunning(false);
        setPhaseRemaining(0);
        return;
      }

      setPhase('inhale');
      setPhaseRemaining(inhaleSeconds);
    }, 1000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [completedCycles, exhaleSeconds, inhaleSeconds, phase, phaseRemaining, running, targetCycles]);

  useEffect(() => {
    if (phase === 'complete' && !completionSent.current) {
      completionSent.current = true;
      onComplete?.();
    }
  }, [onComplete, phase]);

  const start = () => {
    completionSent.current = false;
    if (phase === 'idle' || phase === 'complete') {
      setCompletedCycles(0);
      setPhase('inhale');
      setPhaseRemaining(inhaleSeconds);
    }
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setPhase('idle');
    setCompletedCycles(0);
    setPhaseRemaining(inhaleSeconds);
    completionSent.current = false;
  };

  const phaseLabel =
    phase === 'inhale'
      ? 'شهيق هادئ'
      : phase === 'exhale'
        ? 'زفير أطول'
        : phase === 'complete'
          ? 'أحسنت - ارجع لتنفسك الطبيعي'
          : 'ابدأ عندما تكون جاهزًا';

  return (
    <section className="tool-card breathing-card">
      <div className="tool-card-head">
        <div className="tool-title-icon">
          <Icon name="wind" />
        </div>
        <div>
          <span className="eyebrow">أداة فورية</span>
          <h3>التنفّس الهادئ</h3>
          <p>النفس خفيف ومريح؛ الزفير أطول قليلًا، من غير حبس.</p>
        </div>
      </div>

      <div className="breathing-stage">
        <div
          className={`breathing-orb phase-${phase} ${running ? 'is-running' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}
          style={
            {
              '--phase-duration': `${phase === 'inhale' ? inhaleSeconds : exhaleSeconds}s`,
            } as CSSProperties
          }
        >
          <span className="breathing-halo halo-one" />
          <span className="breathing-halo halo-two" />
          <div className="breathing-orb-core">
            <strong>{phase === 'idle' ? 'جاهز' : phase === 'complete' ? '✓' : phaseRemaining}</strong>
            <span>{phaseLabel}</span>
          </div>
        </div>

        <div className="breathing-progress" aria-label={`تقدم التمرين ${Math.round(progress)} بالمئة`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="breathing-meta">
          <span>
            الدورة {Math.min(completedCycles + (phase === 'complete' ? 0 : 1), targetCycles)} من{' '}
            {targetCycles}
          </span>
          <span>{Math.ceil((targetCycles * (inhaleSeconds + exhaleSeconds)) / 60)} دقائق تقريبًا</span>
        </div>
      </div>

      <div className="breathing-controls">
        {!running ? (
          <button className="button button-primary" type="button" onClick={start}>
            <Icon name="play" size={18} />
            {phase === 'idle' || phase === 'complete' ? 'ابدأ التمرين' : 'استكمل'}
          </button>
        ) : (
          <button className="button button-secondary" type="button" onClick={pause}>
            <Icon name="pause" size={18} />
            إيقاف مؤقت
          </button>
        )}
        <button className="button button-ghost" type="button" onClick={reset}>
          <Icon name="reset" size={17} />
          إعادة
        </button>
      </div>

      <details className="tool-settings">
        <summary>تعديل الإيقاع</summary>
        <div className="settings-grid three-col">
          <label>
            <span>الشهيق</span>
            <select
              value={inhaleSeconds}
              onChange={(event) => setInhaleSeconds(Number(event.target.value))}
              disabled={running}
            >
              {[3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} ثوانٍ
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>الزفير</span>
            <select
              value={exhaleSeconds}
              onChange={(event) => setExhaleSeconds(Number(event.target.value))}
              disabled={running}
            >
              {[4, 5, 6, 7, 8].map((value) => (
                <option key={value} value={value}>
                  {value} ثوانٍ
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>عدد الدورات</span>
            <select
              value={targetCycles}
              onChange={(event) => setTargetCycles(Number(event.target.value))}
              disabled={running}
            >
              {[6, 10, 15, 20, 30].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      <div className="micro-note">
        <Icon name="info" size={17} />
        <span>
          لو شعرت بدوخة، ارجع للتنفس الطبيعي. ولو التركيز على النفس يزعجك، استخدم تمرين الحواس بدلًا منه.
        </span>
      </div>
    </section>
  );
}
