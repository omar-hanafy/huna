import { useMemo, useState } from 'react';
import { Icon } from './Icon';

const steps = [
  { count: 5, label: 'أشياء تراها', hint: 'لون، شكل، ضوء، قطعة أثاث…', icon: 'eye' as const },
  { count: 4, label: 'إحساسات تلمسها', hint: 'قدماك على الأرض، ظهرك على الكرسي…', icon: 'hand' as const },
  { count: 3, label: 'أصوات تسمعها', hint: 'صوت قريب أو بعيد، حتى لو كان هادئًا…', icon: 'ear' as const },
  { count: 2, label: 'روائح تلاحظها', hint: 'قهوة، هواء، صابون، أو حتى لا شيء واضح…', icon: 'nose' as const },
  { count: 1, label: 'مذاق تلاحظه', hint: 'ماء، نعناع، أو تخيّل مذاق مألوف…', icon: 'taste' as const },
];

interface GroundingToolProps {
  onComplete?: () => void;
}

export function GroundingTool({ onComplete }: GroundingToolProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [draft, setDraft] = useState('');
  const [complete, setComplete] = useState(false);

  const current = steps[activeStep];
  const currentAnswers = answers[activeStep] ?? [];
  const totalNeeded = steps.reduce((sum, step) => sum + step.count, 0);
  const totalAdded = Object.values(answers).reduce((sum, values) => sum + values.length, 0);
  const progress = (totalAdded / totalNeeded) * 100;

  const canAdd = draft.trim().length > 0 && currentAnswers.length < current.count;

  const addAnswer = () => {
    if (!canAdd) return;
    const next = [...currentAnswers, draft.trim()];
    setAnswers((previous) => ({ ...previous, [activeStep]: next }));
    setDraft('');

    if (next.length === current.count) {
      if (activeStep < steps.length - 1) {
        window.setTimeout(() => setActiveStep((value) => value + 1), 220);
      } else {
        setComplete(true);
        onComplete?.();
      }
    }
  };

  const removeAnswer = (index: number) => {
    setAnswers((previous) => ({
      ...previous,
      [activeStep]: currentAnswers.filter((_, answerIndex) => answerIndex !== index),
    }));
    setComplete(false);
  };

  const reset = () => {
    setAnswers({});
    setDraft('');
    setActiveStep(0);
    setComplete(false);
  };

  const remainingLabel = useMemo(() => {
    const remaining = current.count - currentAnswers.length;
    return remaining === 0 ? 'اكتملت هذه الخطوة' : `متبقّي ${remaining}`;
  }, [current.count, currentAnswers.length]);

  return (
    <section className="tool-card grounding-card">
      <div className="tool-card-head">
        <div className="tool-title-icon lilac"><Icon name="compass" /></div>
        <div>
          <span className="eyebrow">5 · 4 · 3 · 2 · 1</span>
          <h3>العودة للحواس</h3>
          <p>لاحظ الموجود بالفعل حولك، من غير البحث عن الخطر أو إجبار نفسك على الهدوء.</p>
        </div>
      </div>

      <div className="step-pills" aria-label="خطوات التمرين">
        {steps.map((step, index) => {
          const count = answers[index]?.length ?? 0;
          const done = count >= step.count;
          return (
            <button
              className={`step-pill ${index === activeStep ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
              key={step.label}
              onClick={() => setActiveStep(index)}
              type="button"
            >
              <span>{step.count}</span>
              {done ? <Icon name="check" size={15} /> : null}
            </button>
          );
        })}
      </div>

      <div className="grounding-progress"><span style={{ width: `${progress}%` }} /></div>

      {!complete ? (
        <div className="grounding-stage">
          <div className="grounding-prompt">
            <div className="sense-icon"><Icon name={current.icon} size={26} /></div>
            <div>
              <span>{remainingLabel}</span>
              <h4>{current.count} {current.label}</h4>
              <p>{current.hint}</p>
            </div>
          </div>

          <div className="answer-chips">
            {currentAnswers.map((answer, index) => (
              <button key={`${answer}-${index}`} type="button" onClick={() => removeAnswer(index)} title="اضغط للحذف">
                {answer}
                <Icon name="close" size={13} />
              </button>
            ))}
          </div>

          <div className="grounding-input-row">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addAnswer();
                }
              }}
              placeholder="اكتب ملاحظة حسية قصيرة…"
              aria-label="ملاحظة حسية"
              disabled={currentAnswers.length >= current.count}
            />
            <button className="button button-primary square" type="button" onClick={addAnswer} disabled={!canAdd}>
              <Icon name="plus" />
              <span className="sr-only">إضافة</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="completion-state">
          <div className="completion-icon"><Icon name="leaf" size={30} /></div>
          <span className="eyebrow">رجعت للحاضر</span>
          <h4>لاحظ مكانك واسم اليوم مرة أخيرة</h4>
          <p>لا تحتاج أن تشعر بهدوء كامل. يكفي أنك نقلت انتباهك من التوقع إلى ما يحدث الآن.</p>
          <button className="button button-secondary" type="button" onClick={reset}>
            <Icon name="reset" size={17} />
            ابدأ من جديد
          </button>
        </div>
      )}

      {!complete ? (
        <button className="text-button" type="button" onClick={reset}>
          <Icon name="reset" size={15} />
          مسح الجلسة
        </button>
      ) : null}
    </section>
  );
}
