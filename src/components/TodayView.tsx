import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { DAILY_TASKS, PLAN_WEEKS, SUPPORTIVE_LINES } from '../data/plan';
import type { CheckIn, CoreTaskId, DayRecord, ViewId, WeekNumber } from '../types';
import { calculateCompletion, formatArabicDate, formatArabicTime } from '../utils';
import { Icon } from './Icon';
import { ProgressRing } from './ProgressRing';
import { SectionHeader } from './SectionHeader';

interface TodayViewProps {
  dateKey: string;
  day: DayRecord;
  activeWeek: WeekNumber;
  onToggleTask: (task: CoreTaskId) => void;
  onUpdateDay: (patch: Partial<DayRecord>) => void;
  onAddCheckIn: (checkIn: CheckIn) => void;
  onNavigate: (view: ViewId) => void;
}

const toolMap: Partial<Record<CoreTaskId, string>> = {
  orientation: 'grounding',
  breathing: 'breathing',
  relaxation: 'relaxation',
};

export function TodayView({
  dateKey,
  day,
  activeWeek,
  onToggleTask,
  onUpdateDay,
  onAddCheckIn,
  onNavigate,
}: TodayViewProps) {
  const [checkInValue, setCheckInValue] = useState(5);
  const [checkInNote, setCheckInNote] = useState('');
  const [showProtocol, setShowProtocol] = useState(false);
  const week = PLAN_WEEKS[activeWeek - 1] ?? PLAN_WEEKS[0]!;
  const completion = calculateCompletion(day);
  const lineIndex =
    Math.abs(dateKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % SUPPORTIVE_LINES.length;
  const todayLine = SUPPORTIVE_LINES[lineIndex] ?? SUPPORTIVE_LINES[0];

  const checkInAverage = useMemo(() => {
    if (!day.checkIns.length) return null;
    return day.checkIns.reduce((sum, item) => sum + item.vigilance, 0) / day.checkIns.length;
  }, [day.checkIns]);

  const submitCheckIn = () => {
    const item: CheckIn = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      vigilance: checkInValue,
      note: checkInNote.trim() || undefined,
    };
    onAddCheckIn(item);
    setCheckInNote('');
  };

  return (
    <div className="view-stack">
      <section className="today-hero">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">{formatArabicDate(dateKey)}</span>
          <h1>
            مساحة صغيرة
            <br />
            ترجعك لنفسك.
          </h1>
          <p>{todayLine}</p>
          <div className="hero-actions">
            <button className="button button-light" type="button" onClick={() => onNavigate('tools')}>
              <Icon name="wind" size={18} />
              ابدأ تمرينًا الآن
            </button>
            <button
              className="button button-glass"
              type="button"
              onClick={() => setShowProtocol((value) => !value)}
            >
              <Icon name="shield" size={18} />
              موجة قوية؟
            </button>
          </div>
        </div>
        <div className="hero-progress-wrap">
          <ProgressRing value={completion} size={142} />
          <div className="week-chip">
            <span>أنت في</span>
            <strong>الأسبوع {activeWeek}</strong>
          </div>
        </div>
      </section>

      {showProtocol ? (
        <section className="protocol-panel">
          <div className="protocol-head">
            <div className="protocol-icon">
              <Icon name="shield" />
            </div>
            <div>
              <span className="eyebrow">بروتوكول 60–120 ثانية</span>
              <h3>تعامل مع الموجة، خطوة واحدة كل مرة</h3>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setShowProtocol(false)}
              aria-label="إغلاق"
            >
              <Icon name="close" />
            </button>
          </div>
          <ol className="protocol-steps">
            <li>
              <span>1</span>
              <div>
                <strong>افحص الخطر مرة واحدة</strong>
                <p>هل يوجد خطر مباشر يحتاج خروجًا أو مساعدة؟</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>سمِّ ما يحدث</strong>
                <p>“هذا استنفار مرتفع، وليس حكمًا نهائيًا على الواقع.”</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>ثبّت جسمك</strong>
                <p>قدماك على الأرض، كتفاك لأسفل، والفك مرتخٍ.</p>
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                <strong>ارجع للحاضر</strong>
                <p>اسم المكان، التاريخ، وخمسة أشياء أمامك.</p>
              </div>
            </li>
            <li>
              <span>5</span>
              <div>
                <strong>نفّذ فعلًا واحدًا</strong>
                <p>اشرب ماء، تحرك لدقيقتين، أو أكمل خطوة صغيرة.</p>
              </div>
            </li>
          </ol>
          <div className="protocol-quote">
            قد أشعر بالخطر دون أن أكون في خطر. سأتحقق مرة واحدة ثم أرجع للحظة الحالية.
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          eyebrow="روتين اليوم"
          title="خطوات صغيرة، مش اختبار أداء"
          description="اضغط على الدائرة عند الانتهاء. حتى تنفيذ جزء من المهمة يُحسب كتقدّم."
          action={<span className="quiet-badge">{Object.values(day.tasks).filter(Boolean).length} من 6</span>}
        />

        <div className="task-grid">
          {DAILY_TASKS.map((task) => {
            const done = day.tasks[task.id];
            return (
              <article className={`task-card ${done ? 'is-done' : ''}`} key={task.id}>
                <button
                  className="task-check"
                  onClick={() => onToggleTask(task.id)}
                  type="button"
                  aria-label={done ? `إلغاء إكمال ${task.title}` : `إكمال ${task.title}`}
                >
                  {done ? <Icon name="check" size={18} /> : null}
                </button>
                <div className="task-icon">
                  <Icon name={task.icon as Parameters<typeof Icon>[0]['name']} />
                </div>
                <div className="task-copy">
                  <span>{task.duration}</span>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                </div>
                {toolMap[task.id] ? (
                  <button className="task-link" type="button" onClick={() => onNavigate('tools')}>
                    فتح الأدوات
                    <Icon name="arrow" size={15} />
                  </button>
                ) : null}
              </article>
            );
          })}

          <article className={`task-card focus-task ${day.tasks.weekFocus ? 'is-done' : ''}`}>
            <button
              className="task-check"
              onClick={() => onToggleTask('weekFocus')}
              type="button"
              aria-label={day.tasks.weekFocus ? 'إلغاء إكمال تركيز الأسبوع' : 'إكمال تركيز الأسبوع'}
            >
              {day.tasks.weekFocus ? <Icon name="check" size={18} /> : null}
            </button>
            <div className="task-icon">
              <Icon name="target" />
            </div>
            <div className="task-copy">
              <span>تركيز الأسبوع {activeWeek}</span>
              <h3>{week.title}</h3>
              <p>{week.focusTask}</p>
            </div>
            <button
              className="task-link"
              type="button"
              onClick={() => onNavigate(activeWeek === 2 ? 'journal' : 'plan')}
            >
              فتح التفاصيل
              <Icon name="arrow" size={15} />
            </button>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="checkin-card panel-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">30 ثانية</span>
              <h3>راجع الإنذار</h3>
            </div>
            <div className="checkin-count">
              <strong>{day.checkIns.length}</strong>
              <span>/ 3 اليوم</span>
            </div>
          </div>

          <div className="slider-heading">
            <label htmlFor="checkin-slider">مستوى الاستنفار الآن</label>
            <output>{checkInValue}/10</output>
          </div>
          <input
            id="checkin-slider"
            className="range-control"
            type="range"
            min="0"
            max="10"
            step="1"
            value={checkInValue}
            onChange={(event) => setCheckInValue(Number(event.target.value))}
            style={{ '--range-progress': `${checkInValue * 10}%` } as CSSProperties}
          />
          <div className="range-labels">
            <span>هادئ نسبيًا</span>
            <span>مرتفع جدًا</span>
          </div>

          <input
            className="soft-input"
            value={checkInNote}
            onChange={(event) => setCheckInNote(event.target.value)}
            placeholder="ملاحظة اختيارية: ماذا كان يحدث؟"
          />
          <button className="button button-primary full-width" type="button" onClick={submitCheckIn}>
            <Icon name="pulse" size={18} />
            تسجيل المراجعة
          </button>

          {day.checkIns.length ? (
            <div className="checkin-history">
              <div className="history-summary">
                <span>متوسط اليوم</span>
                <strong>{checkInAverage?.toFixed(1)}/10</strong>
              </div>
              <div className="history-dots">
                {day.checkIns.slice(-7).map((item) => (
                  <div key={item.id} title={`${formatArabicTime(item.createdAt)} - ${item.vigilance}/10`}>
                    <span style={{ height: `${Math.max(12, item.vigilance * 7)}%` }} />
                    <small>{item.vigilance}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <article className="daily-log panel-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">نهاية اليوم</span>
              <h3>سجل بسيط بلا اجترار</h3>
            </div>
            <div className="soft-icon">
              <Icon name="moon" />
            </div>
          </div>

          <div className="field-grid two-col">
            <label>
              <span>ساعات النوم</span>
              <div className="input-with-suffix">
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={day.sleepHours ?? ''}
                  onChange={(event) =>
                    onUpdateDay({ sleepHours: event.target.value === '' ? null : Number(event.target.value) })
                  }
                  placeholder="7"
                />
                <small>ساعة</small>
              </div>
            </label>
            <label>
              <span>مدة العودة بعد موجة</span>
              <div className="input-with-suffix">
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={day.recoveryMinutes ?? ''}
                  onChange={(event) =>
                    onUpdateDay({
                      recoveryMinutes: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                  placeholder="15"
                />
                <small>دقيقة</small>
              </div>
            </label>
          </div>

          <div className="slider-heading compact">
            <label htmlFor="daily-vigilance">تقييم اليوم إجمالًا</label>
            <output>
              {day.vigilance ?? '-'}
              {day.vigilance !== null ? '/10' : ''}
            </output>
          </div>
          <input
            id="daily-vigilance"
            className="range-control"
            type="range"
            min="0"
            max="10"
            step="1"
            value={day.vigilance ?? 5}
            onChange={(event) => onUpdateDay({ vigilance: Number(event.target.value) })}
            style={{ '--range-progress': `${(day.vigilance ?? 5) * 10}%` } as CSSProperties}
          />

          <label className="textarea-label">
            <span>أكثر شيء ساعدني اليوم</span>
            <textarea
              value={day.note}
              onChange={(event) => onUpdateDay({ note: event.target.value })}
              placeholder="مثال: المشي بعد العصر، أو إرخاء الفك وقت التوتر…"
              rows={3}
            />
          </label>
          <div className="autosave-note">
            <span /> محفوظ تلقائيًا على جهازك
          </div>
        </article>
      </section>

      <section className="week-preview">
        <div className="week-preview-number">0{activeWeek}</div>
        <div className="week-preview-copy">
          <span className="eyebrow">المسار الحالي</span>
          <h2>{week.title}</h2>
          <p>{week.description}</p>
          <div className="outcome-line">
            <Icon name="leaf" size={18} />
            <span>المؤشر المهم: {week.outcome}</span>
          </div>
        </div>
        <button className="button button-secondary" type="button" onClick={() => onNavigate('plan')}>
          عرض خطة الأسابيع
          <Icon name="arrow" size={16} />
        </button>
      </section>
    </div>
  );
}
