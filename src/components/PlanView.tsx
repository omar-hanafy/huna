import { PLAN_WEEKS } from '../data/plan';
import type { WeekNumber } from '../types';
import { Icon } from './Icon';
import { SectionHeader } from './SectionHeader';

interface PlanViewProps {
  activeWeek: WeekNumber;
  onSetWeek: (week: WeekNumber) => void;
}

export function PlanView({ activeWeek, onSetWeek }: PlanViewProps) {
  return (
    <div className="view-stack">
      <section className="page-intro plan-intro">
        <div>
          <span className="eyebrow">مسار مرن · 4 أسابيع</span>
          <h1>
            مش سباق للهدوء.
            <br />
            دي ممارسة للمرونة.
          </h1>
          <p>
            يمكنك البقاء في أي أسبوع مدة أطول، أو الرجوع خطوة عندما تحتاج. ترتيب الخطة مقترح وليس اختبارًا
            زمنيًا.
          </p>
        </div>
        <div className="intro-art" aria-hidden="true">
          <span className="intro-orbit orbit-a" />
          <span className="intro-orbit orbit-b" />
          <span className="intro-seed">
            <Icon name="leaf" size={28} />
          </span>
        </div>
      </section>

      <SectionHeader
        eyebrow="الخطة كاملة"
        title="كل أسبوع له هدف واحد واضح"
        description="الروتين الأساسي مستمر، ويضاف إليه تركيز صغير يناسب مرحلة التدريب."
      />

      <div className="plan-timeline">
        {PLAN_WEEKS.map((week) => (
          <article
            className={`plan-week-card accent-${week.accent} ${activeWeek === week.number ? 'is-active' : ''}`}
            key={week.number}
          >
            <div className="plan-marker">
              <span>{String(week.number).padStart(2, '0')}</span>
              <i />
            </div>
            <div className="plan-week-main">
              <div className="plan-week-head">
                <div>
                  <span className="eyebrow">{week.eyebrow}</span>
                  <h2>{week.title}</h2>
                  <p>{week.description}</p>
                </div>
                {activeWeek === week.number ? (
                  <span className="active-week-badge">
                    <Icon name="check" size={15} /> الأسبوع الحالي
                  </span>
                ) : (
                  <button
                    className="button button-small button-ghost"
                    type="button"
                    onClick={() => onSetWeek(week.number)}
                  >
                    ابدأ هذا الأسبوع
                  </button>
                )}
              </div>

              <div className="plan-detail-grid">
                <div>
                  <span className="detail-label">
                    <Icon name="calendar" size={16} /> يوميًا
                  </span>
                  <ul className="clean-list">
                    {week.daily.map((item) => (
                      <li key={item}>
                        <Icon name="check" size={15} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="detail-label">
                    <Icon name="shield" size={16} /> حدود مهمة
                  </span>
                  <ul className="clean-list warning-list">
                    {week.avoid.map((item) => (
                      <li key={item}>
                        <span>!</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="week-focus-strip">
                <div>
                  <Icon name="target" size={20} />
                </div>
                <p>
                  <span>تركيز الأسبوع:</span> {week.focusTask}
                </p>
                <strong>{week.outcome}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="expectations-panel">
        <div className="expectations-copy">
          <span className="eyebrow">كيف تقرأ التقدّم؟</span>
          <h2>ابحث عن التحسّن الناعم</h2>
          <p>
            أحيانًا لا يقل عدد الموجات فورًا، لكنك تبدأ في ملاحظتها أسرع، وتصرف وقتًا أقل داخلها، وتعود لما
            يهمك بسهولة أكبر.
          </p>
        </div>
        <div className="expectations-grid">
          <div>
            <strong>أقل شدة</strong>
            <span>حتى لو بنقطة واحدة</span>
          </div>
          <div>
            <strong>أقصر مدة</strong>
            <span>عودة أسرع للحاضر</span>
          </div>
          <div>
            <strong>تجنّب أقل</strong>
            <span>خطوات آمنة صغيرة</span>
          </div>
          <div>
            <strong>اختيار أكثر</strong>
            <span>التصرف وفق قيمك</span>
          </div>
        </div>
      </section>
    </div>
  );
}
