import { useMemo } from 'react';
import type { DayRecord, JournalEntry } from '../types';
import { addDays, average, calculateCompletion, formatArabicDate, toLocalDateKey } from '../utils';
import { Icon } from './Icon';
import { SectionHeader } from './SectionHeader';

interface ProgressViewProps {
  days: Record<string, DayRecord>;
  journal: JournalEntry[];
}

export function ProgressView({ days, journal }: ProgressViewProps) {
  const todayKey = toLocalDateKey();
  const last14 = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = addDays(todayKey, index - 13);
        return { date, day: days[date] };
      }),
    [days, todayKey],
  );

  const recordedDays = last14.filter((item) => item.day);
  const averageVigilance = average(recordedDays.map((item) => item.day?.vigilance));
  const averageRecovery = average(recordedDays.map((item) => item.day?.recoveryMinutes));
  const averageSleep = average(recordedDays.map((item) => item.day?.sleepHours));
  const averageCompletion = average(recordedDays.map((item) => calculateCompletion(item.day)));

  const streak = useMemo(() => {
    let count = 0;
    for (let offset = 0; offset < 365; offset += 1) {
      const date = addDays(todayKey, -offset);
      const day = days[date];
      if (!day || calculateCompletion(day) <= 0) break;
      count += 1;
    }
    return count;
  }, [days, todayKey]);

  const journalReduction = average(journal.map((entry) => entry.intensityBefore - entry.intensityAfter));

  return (
    <div className="view-stack">
      <section className="page-intro progress-intro">
        <div>
          <span className="eyebrow">نظرة رحيمة · آخر 14 يومًا</span>
          <h1>
            نقيس الاتجاه.
            <br />
            مش نحاكم اليوم.
          </h1>
          <p>
            الأرقام هنا إشارات تقريبية تساعدك تلاحظ الأنماط. يوم واحد مرتفع لا يلغي اتجاهًا كاملًا من التعلّم.
          </p>
        </div>
        <div className="streak-card">
          <div className="streak-flame">
            <Icon name="sparkles" size={25} />
          </div>
          <strong>{streak}</strong>
          <span>
            أيام متتالية
            <br />
            بأي خطوة
          </span>
        </div>
      </section>

      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-icon mint">
            <Icon name="pulse" />
          </span>
          <div>
            <span>متوسط الاستنفار</span>
            <strong>
              {averageVigilance === null ? '-' : averageVigilance.toFixed(1)}
              <small>{averageVigilance === null ? '' : '/10'}</small>
            </strong>
          </div>
          <p>الأقل ليس دائمًا الهدف الوحيد؛ راقب مدة التعافي أيضًا.</p>
        </article>
        <article className="metric-card">
          <span className="metric-icon sky">
            <Icon name="clock" />
          </span>
          <div>
            <span>متوسط العودة</span>
            <strong>
              {averageRecovery === null ? '-' : Math.round(averageRecovery)}
              <small>{averageRecovery === null ? '' : ' د'}</small>
            </strong>
          </div>
          <p>تقدير تقريبي للوقت حتى ترجع لنشاطك أو حضورك.</p>
        </article>
        <article className="metric-card">
          <span className="metric-icon lilac">
            <Icon name="moon" />
          </span>
          <div>
            <span>متوسط النوم</span>
            <strong>
              {averageSleep === null ? '-' : averageSleep.toFixed(1)}
              <small>{averageSleep === null ? '' : ' س'}</small>
            </strong>
          </div>
          <p>ابحث عن العلاقة بين النوم والاستنفار، لا عن رقم مثالي.</p>
        </article>
        <article className="metric-card">
          <span className="metric-icon peach">
            <Icon name="target" />
          </span>
          <div>
            <span>متوسط تنفيذ الروتين</span>
            <strong>
              {averageCompletion === null ? '-' : Math.round(averageCompletion)}
              <small>{averageCompletion === null ? '' : '%'}</small>
            </strong>
          </div>
          <p>أي خطوة محسوبة. الاستمرارية المرنة أهم من الكمال.</p>
        </article>
      </div>

      <section className="chart-card panel-card">
        <SectionHeader
          eyebrow="المسار اليومي"
          title="الإنجاز والاستنفار جنبًا إلى جنب"
          description="ارتفاع الاستنفار مع استمرارك في تنفيذ خطوة صغيرة يمكن أن يكون علامة مرونة، وليس فشلًا."
        />
        <div className="chart-legend">
          <span>
            <i className="legend-completion" /> تنفيذ الروتين
          </span>
          <span>
            <i className="legend-vigilance" /> الاستنفار
          </span>
        </div>
        <div className="dual-chart" aria-label="رسم بياني لآخر أربعة عشر يومًا">
          {last14.map(({ date, day }) => {
            const completion = calculateCompletion(day);
            const vigilance = day?.vigilance ?? null;
            const label = formatArabicDate(date, { day: 'numeric', month: 'numeric' });
            return (
              <div
                className="chart-column"
                key={date}
                title={`${label}: إنجاز ${Math.round(completion)}%، استنفار ${vigilance ?? 'غير مسجل'}`}
              >
                <div className="bars-wrap">
                  <span
                    className="bar completion-bar"
                    style={{ height: `${Math.max(completion ? 5 : 0, completion)}%` }}
                  />
                  <span
                    className="bar vigilance-bar"
                    style={{ height: `${vigilance === null ? 0 : Math.max(5, vigilance * 10)}%` }}
                  />
                </div>
                <small>{formatArabicDate(date, { day: 'numeric' })}</small>
              </div>
            );
          })}
        </div>
        {!recordedDays.length ? (
          <div className="chart-empty">ابدأ بتسجيل يوم واحد، وسيظهر المسار هنا تدريجيًا.</div>
        ) : null}
      </section>

      <section className="insights-grid">
        <article className="insight-card">
          <div className="insight-head">
            <span className="metric-icon mint">
              <Icon name="journal" />
            </span>
            <div>
              <span className="eyebrow">من سجل المحفزات</span>
              <h3>المسافة بعد خطوة واحدة</h3>
            </div>
          </div>
          <strong className="big-insight">
            {journalReduction === null ? '-' : journalReduction.toFixed(1)}
            <small>{journalReduction === null ? '' : ' نقطة'}</small>
          </strong>
          <p>
            {journalReduction === null
              ? 'أضف موقفًا واحدًا لتظهر مقارنة الشدة قبل التعامل وبعده.'
              : 'متوسط الانخفاض بين شدة الإنذار قبل التعامل وبعد تنفيذ خطوة واحدة.'}
          </p>
        </article>
        <article className="insight-card value-insight">
          <div className="insight-head">
            <span className="metric-icon lilac">
              <Icon name="leaf" />
            </span>
            <div>
              <span className="eyebrow">تذكير مهم</span>
              <h3>الأرقام لا تعرف القصة كلها</h3>
            </div>
          </div>
          <blockquote>
            قد يكون يوم 8/10 ناجحًا جدًا لأنك بقيت حاضرًا، خفّضت الفحص، أو فعلت شيئًا مهمًا رغم الموجة.
          </blockquote>
        </article>
      </section>

      <section className="progress-questions">
        <div>
          <span className="eyebrow">مراجعة أسبوعية</span>
          <h2>ثلاثة أسئلة أهم من الرسم</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <p>هل ألاحظ الإنذار أبكر من قبل؟</p>
          </li>
          <li>
            <span>02</span>
            <p>هل أعود لما كنت أفعله أسرع أو بفحص أقل؟</p>
          </li>
          <li>
            <span>03</span>
            <p>هل أختار أفعالًا تخدم حياتي حتى مع وجود التوتر؟</p>
          </li>
        </ol>
      </section>
    </div>
  );
}
