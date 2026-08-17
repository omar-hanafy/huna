import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { JournalEntry } from '../types';
import { formatArabicDate, formatArabicTime, toLocalDateKey } from '../utils';
import { Icon } from './Icon';
import { SectionHeader } from './SectionHeader';

interface JournalViewProps {
  entries: JournalEntry[];
  onAdd: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  onMarkFocusComplete: () => void;
}

const emptyForm = {
  trigger: '',
  prediction: '',
  evidenceDanger: '',
  evidenceAlarm: '',
  response: '',
  recoveryMinutes: '',
  intensityBefore: 7,
  intensityAfter: 5,
};

export function JournalView({ entries, onAdd, onDelete, onMarkFocusComplete }: JournalViewProps) {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(entries.length === 0);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.trigger.trim()) return;

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      trigger: form.trigger.trim(),
      prediction: form.prediction.trim(),
      evidenceDanger: form.evidenceDanger.trim(),
      evidenceAlarm: form.evidenceAlarm.trim(),
      response: form.response.trim(),
      recoveryMinutes: form.recoveryMinutes === '' ? null : Number(form.recoveryMinutes),
      intensityBefore: form.intensityBefore,
      intensityAfter: form.intensityAfter,
    };

    onAdd(entry);
    onMarkFocusComplete();
    setForm(emptyForm);
    setShowForm(false);
  };

  return (
    <div className="view-stack">
      <section className="page-intro journal-intro">
        <div>
          <span className="eyebrow">سجل واحد يكفي</span>
          <h1>
            نفهم الإنذار.
            <br />
            من غير ما نعيش داخله.
          </h1>
          <p>
            الغرض هو رؤية النمط بوضوح، لا تحليل كل لحظة. اختر موقفًا واحدًا مهمًا، ثم اترك السجل وارجع ليومك.
          </p>
        </div>
        <div className="journal-quote">
          <Icon name="journal" size={22} />
          <p>“أنا ألاحظ أن عقلي يقول إن… لكن الفكرة ليست دليلًا وحدها.”</p>
        </div>
      </section>

      <SectionHeader
        eyebrow="سجل المحفزات"
        title="مسافة صغيرة بين الفكرة والواقع"
        description="لا يلزم ملء كل الحقول. اكتب ما يساعدك على رؤية الصورة، واترك الباقي."
        action={
          <button
            className="button button-primary"
            type="button"
            onClick={() => setShowForm((value) => !value)}
          >
            <Icon name={showForm ? 'close' : 'plus'} size={17} />
            {showForm ? 'إغلاق النموذج' : 'إضافة موقف'}
          </button>
        }
      />

      {showForm ? (
        <form className="journal-form panel-card" onSubmit={submit}>
          <div className="form-step-heading">
            <span>01</span>
            <div>
              <h3>ماذا حدث قبل الاستنفار؟</h3>
              <p>صف الموقف في جملة أو جملتين، من غير تفسير طويل.</p>
            </div>
          </div>
          <textarea
            value={form.trigger}
            onChange={(event) => update('trigger', event.target.value)}
            placeholder="مثال: سمعت صوتًا مرتفعًا وأنا أعمل…"
            rows={3}
            required
          />

          <div className="form-divider" />

          <div className="form-step-heading">
            <span>02</span>
            <div>
              <h3>ماذا توقّع عقلك أن يحدث؟</h3>
              <p>اكتب التوقع كما ظهر، من غير لوم أو تصحيح فوري.</p>
            </div>
          </div>
          <textarea
            value={form.prediction}
            onChange={(event) => update('prediction', event.target.value)}
            placeholder="مثلًا: اعتقدت أن هناك مشكلة أو أنني يجب أن أهرب…"
            rows={3}
          />

          <div className="form-divider" />

          <div className="evidence-grid">
            <label>
              <span className="field-title">
                <Icon name="shield" size={17} /> ما الدليل على خطر مباشر الآن؟
              </span>
              <textarea
                value={form.evidenceDanger}
                onChange={(event) => update('evidenceDanger', event.target.value)}
                placeholder="حقائق قابلة للملاحظة، وليس احتمالات فقط…"
                rows={4}
              />
            </label>
            <label>
              <span className="field-title">
                <Icon name="compass" size={17} /> ما الدليل أنه إنذار زائد؟
              </span>
              <textarea
                value={form.evidenceAlarm}
                onChange={(event) => update('evidenceAlarm', event.target.value)}
                placeholder="مثلًا: المكان مألوف، الصوت انتهى، لا أحد يتصرف كأن هناك خطرًا…"
                rows={4}
              />
            </label>
          </div>

          <div className="form-divider" />

          <div className="field-grid two-col journal-ratings">
            <label>
              <span>الشدة قبل التعامل</span>
              <div className="rating-output">{form.intensityBefore}/10</div>
              <input
                className="range-control"
                type="range"
                min="0"
                max="10"
                value={form.intensityBefore}
                onChange={(event) => update('intensityBefore', Number(event.target.value))}
                style={{ '--range-progress': `${form.intensityBefore * 10}%` } as CSSProperties}
              />
            </label>
            <label>
              <span>الشدة بعد خطوة واحدة</span>
              <div className="rating-output">{form.intensityAfter}/10</div>
              <input
                className="range-control"
                type="range"
                min="0"
                max="10"
                value={form.intensityAfter}
                onChange={(event) => update('intensityAfter', Number(event.target.value))}
                style={{ '--range-progress': `${form.intensityAfter * 10}%` } as CSSProperties}
              />
            </label>
          </div>

          <div className="field-grid two-col">
            <label>
              <span>ماذا فعلت؟ وهل ساعد؟</span>
              <textarea
                value={form.response}
                onChange={(event) => update('response', event.target.value)}
                placeholder="تحققت مرة، ثبتُّ قدمي، ثم أكملت المهمة…"
                rows={3}
              />
            </label>
            <label>
              <span>وقت العودة النسبي</span>
              <div className="input-with-suffix journal-time-input">
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={form.recoveryMinutes}
                  onChange={(event) => update('recoveryMinutes', event.target.value)}
                  placeholder="15"
                />
                <small>دقيقة</small>
              </div>
              <small className="field-help">تقريب تقريبي يكفي؛ لا تحتاج مراقبة الساعة بدقة.</small>
            </label>
          </div>

          <div className="form-actions">
            <button className="button button-primary" type="submit">
              <Icon name="check" size={18} />
              حفظ الموقف والعودة لليوم
            </button>
            <button className="button button-ghost" type="button" onClick={() => setForm(emptyForm)}>
              مسح الحقول
            </button>
          </div>
        </form>
      ) : null}

      <section>
        <div className="entries-heading">
          <div>
            <span className="eyebrow">السجل السابق</span>
            <h2>{entries.length ? `${entries.length} مواقف محفوظة` : 'لا توجد مواقف محفوظة بعد'}</h2>
          </div>
          {entries.length ? <span className="quiet-badge">الأحدث أولًا</span> : null}
        </div>

        {entries.length ? (
          <div className="journal-list">
            {entries.map((entry) => {
              const dateKey = toLocalDateKey(new Date(entry.createdAt));
              const delta = entry.intensityBefore - entry.intensityAfter;
              return (
                <details className="journal-entry" key={entry.id}>
                  <summary>
                    <div className="entry-date">
                      <span>{formatArabicDate(dateKey, { day: 'numeric', month: 'short' })}</span>
                      <small>{formatArabicTime(entry.createdAt)}</small>
                    </div>
                    <div className="entry-summary-copy">
                      <h3>{entry.trigger}</h3>
                      <p>{entry.prediction || 'لم يُسجّل توقع محدد'}</p>
                    </div>
                    <div className={`entry-delta ${delta > 0 ? 'is-lower' : ''}`}>
                      <span>{entry.intensityBefore}</span>
                      <Icon name="arrow" size={14} />
                      <strong>{entry.intensityAfter}</strong>
                    </div>
                    <Icon className="entry-chevron" name="chevron" size={18} />
                  </summary>
                  <div className="entry-details">
                    <div>
                      <span>دليل الخطر</span>
                      <p>{entry.evidenceDanger || '-'}</p>
                    </div>
                    <div>
                      <span>دليل الإنذار الزائد</span>
                      <p>{entry.evidenceAlarm || '-'}</p>
                    </div>
                    <div>
                      <span>ما تم فعله</span>
                      <p>{entry.response || '-'}</p>
                    </div>
                    <div>
                      <span>مدة العودة</span>
                      <p>{entry.recoveryMinutes === null ? 'غير مسجلة' : `${entry.recoveryMinutes} دقيقة`}</p>
                    </div>
                    <button className="delete-entry" type="button" onClick={() => onDelete(entry.id)}>
                      <Icon name="trash" size={16} /> حذف هذا السجل
                    </button>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div>
              <Icon name="journal" size={28} />
            </div>
            <h3>ابدأ فقط عندما يوجد موقف يستحق التسجيل</h3>
            <p>لا تحتاج إلى كتابة يوميات طويلة. موقف واحد واضح يمكن أن يكشف نمطًا مفيدًا.</p>
            <button className="button button-secondary" type="button" onClick={() => setShowForm(true)}>
              <Icon name="plus" size={17} /> إضافة أول موقف
            </button>
          </div>
        )}
      </section>

      <div className="micro-note spacious">
        <Icon name="info" size={18} />
        <span>
          هذا السجل ليس مناسبًا لاسترجاع تفاصيل صدمة أو تنفيذ تعرّض للذكريات بمفردك. عند وجود استرجاعات أو
          انفصال عن الواقع، الأفضل استخدامه مع مختص مؤهل.
        </span>
      </div>
    </div>
  );
}
