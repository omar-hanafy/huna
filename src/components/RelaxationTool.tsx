import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';

const groups = ['الوجه والفك', 'الكتفان', 'اليدان', 'البطن', 'الساقان'];
type Stage = 'idle' | 'tense' | 'release' | 'complete';

interface RelaxationToolProps {
  onComplete?: () => void;
}

export function RelaxationTool({ onComplete }: RelaxationToolProps) {
  const [groupIndex, setGroupIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [remaining, setRemaining] = useState(4);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || stage === 'idle' || stage === 'complete') return;

    const timer = window.setTimeout(() => {
      if (remaining > 1) {
        setRemaining(remaining - 1);
        return;
      }

      if (stage === 'tense') {
        setStage('release');
        setRemaining(8);
        return;
      }

      if (groupIndex >= groups.length - 1) {
        setRunning(false);
        setStage('complete');
        setRemaining(0);
        onComplete?.();
        return;
      }

      setGroupIndex(groupIndex + 1);
      setStage('tense');
      setRemaining(4);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [groupIndex, onComplete, remaining, running, stage]);

  const progress = useMemo(() => {
    if (stage === 'complete') return 100;
    const base = groupIndex / groups.length;
    const within = stage === 'release' ? 0.7 : stage === 'tense' ? 0.2 : 0;
    return Math.min(100, (base + within / groups.length) * 100);
  }, [groupIndex, stage]);

  const start = () => {
    if (stage === 'idle' || stage === 'complete') {
      setGroupIndex(0);
      setStage('tense');
      setRemaining(4);
    }
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setGroupIndex(0);
    setStage('idle');
    setRemaining(4);
  };

  return (
    <section className="tool-card relaxation-card">
      <div className="tool-card-head">
        <div className="tool-title-icon peach">
          <Icon name="sparkles" />
        </div>
        <div>
          <span className="eyebrow">شد 4 · إرخاء 8</span>
          <h3>استرخاء عضلي مصغّر</h3>
          <p>شد خفيف فقط، ثم لاحظ الفرق عندما تترك العضلة. تجنّب أي منطقة مؤلمة أو مصابة.</p>
        </div>
      </div>

      <div className="relaxation-stage">
        <div className="body-map" aria-hidden="true">
          {groups.map((group, index) => (
            <span
              key={group}
              className={`${index === groupIndex ? 'is-active' : ''} ${index < groupIndex || stage === 'complete' ? 'is-done' : ''}`}
            />
          ))}
        </div>

        {stage === 'complete' ? (
          <div className="relaxation-copy">
            <span className="eyebrow">اكتمل التمرين</span>
            <h4>ارجع لوضع طبيعي ومريح</h4>
            <p>حرّك أصابعك قليلًا، ثم لاحظ دعم الكرسي أو الأرض لجسمك.</p>
          </div>
        ) : (
          <div className="relaxation-copy">
            <span className="eyebrow">
              المجموعة {groupIndex + 1} من {groups.length}
            </span>
            <h4>{stage === 'idle' ? 'ابدأ بوضع مريح' : groups[groupIndex]}</h4>
            <p>
              {stage === 'tense'
                ? 'شد برفق… من غير ألم'
                : stage === 'release'
                  ? 'اترك العضلة تمامًا ولاحظ الفرق'
                  : 'سنمر على خمس مجموعات عضلية بصورة بسيطة.'}
            </p>
            <strong className="relaxation-count">{stage === 'idle' ? '-' : remaining}</strong>
          </div>
        )}
      </div>

      <div className="breathing-progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="breathing-controls">
        {!running ? (
          <button className="button button-primary" type="button" onClick={start}>
            <Icon name="play" size={18} />
            {stage === 'idle' || stage === 'complete' ? 'ابدأ' : 'استكمل'}
          </button>
        ) : (
          <button className="button button-secondary" type="button" onClick={() => setRunning(false)}>
            <Icon name="pause" size={18} />
            إيقاف مؤقت
          </button>
        )}
        <button className="button button-ghost" type="button" onClick={reset}>
          <Icon name="reset" size={17} />
          إعادة
        </button>
      </div>
    </section>
  );
}
