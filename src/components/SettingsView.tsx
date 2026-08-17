import { useRef, useState } from 'react';
import type { AppSettings, AppState } from '../types';
import { Icon } from './Icon';
import { SectionHeader } from './SectionHeader';

interface SettingsViewProps {
  state: AppState;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onImport: (state: AppState) => void;
  onReset: () => void;
}

export function SettingsView({ state, settings, onUpdateSettings, onImport, onReset }: SettingsViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sakina-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AppState;
      if (parsed?.version !== 1 || !parsed.days || !Array.isArray(parsed.journal)) {
        throw new Error('invalid');
      }
      onImport(parsed);
      setImportMessage('تم استيراد النسخة بنجاح.');
    } catch {
      setImportMessage('تعذّر قراءة الملف. تأكد أنه نسخة JSON صادرة من سَكينة.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onReset();
    setConfirmReset(false);
    setImportMessage('تمت إعادة البيانات للبداية.');
  };

  return (
    <div className="view-stack">
      <section className="page-intro settings-intro">
        <div>
          <span className="eyebrow">تجربة هادئة وخصوصية محلية</span>
          <h1>
            أنت صاحب البيانات.
            <br />
            وأنت صاحب الإيقاع.
          </h1>
          <p>
            كل ما تكتبه يُحفظ في Local Storage داخل هذا المتصفح. لا يوجد حساب أو خادم أو إرسال للبيانات في
            النسخة الحالية.
          </p>
        </div>
        <div className="privacy-visual" aria-hidden="true">
          <Icon name="shield" size={34} />
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="التجربة"
          title="اضبط الواجهة بما يريحك"
          description="هذه الإعدادات تغيّر العرض فقط، ولا تؤثر على محتوى الخطة."
        />
        <div className="settings-list panel-card">
          <label className="setting-row">
            <div className="setting-icon">
              <Icon name="sparkles" />
            </div>
            <div>
              <strong>تقليل الحركة</strong>
              <span>يوقف التحولات البصرية الكبيرة في أداة التنفّس والواجهة.</span>
            </div>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) => onUpdateSettings({ reducedMotion: event.target.checked })}
            />
          </label>
          <label className="setting-row">
            <div className="setting-icon">
              <Icon name="eye" />
            </div>
            <div>
              <strong>وضع مضغوط</strong>
              <span>يقلّل المسافات وحجم بعض البطاقات على الشاشات الكبيرة.</span>
            </div>
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(event) => onUpdateSettings({ compactMode: event.target.checked })}
            />
          </label>
          <label className="setting-row">
            <div className="setting-icon">
              <Icon name="heart" />
            </div>
            <div>
              <strong>تذكيرات لطيفة داخل الواجهة</strong>
              <span>يعرض عبارات تذكّر بالمرونة بدل السعي للكمال.</span>
            </div>
            <input
              type="checkbox"
              checked={settings.gentleReminders}
              onChange={(event) => onUpdateSettings({ gentleReminders: event.target.checked })}
            />
          </label>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="النسخ الاحتياطي"
          title="صدّر بياناتك أو انقلها"
          description="الملف بصيغة JSON ويمكنك استخدامه لاحقًا في API أو قاعدة بيانات عند تطوير المشروع."
        />
        <div className="data-actions-grid">
          <article className="data-action-card">
            <span className="data-action-icon mint">
              <Icon name="download" />
            </span>
            <h3>تصدير نسخة</h3>
            <p>يحفظ الأيام، السجل، الأسبوع الحالي، وإعدادات الواجهة في ملف واحد.</p>
            <button className="button button-secondary" type="button" onClick={exportData}>
              <Icon name="download" size={17} /> تنزيل JSON
            </button>
          </article>
          <article className="data-action-card">
            <span className="data-action-icon sky">
              <Icon name="upload" />
            </span>
            <h3>استيراد نسخة</h3>
            <p>سيستبدل البيانات الحالية بمحتوى الملف بعد التحقق من بنيته الأساسية.</p>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
              }}
            />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="upload" size={17} /> اختيار ملف
            </button>
          </article>
          <article className="data-action-card danger-card">
            <span className="data-action-icon peach">
              <Icon name="trash" />
            </span>
            <h3>بدء جديد</h3>
            <p>يمسح كل البيانات المحلية. صدّر نسخة أولًا لو كنت قد تحتاج إليها.</p>
            <button
              className={`button ${confirmReset ? 'button-danger' : 'button-ghost'}`}
              type="button"
              onClick={reset}
            >
              <Icon name="trash" size={17} />
              {confirmReset ? 'اضغط مرة ثانية للتأكيد' : 'مسح البيانات'}
            </button>
            {confirmReset ? (
              <button className="text-button" type="button" onClick={() => setConfirmReset(false)}>
                إلغاء
              </button>
            ) : null}
          </article>
        </div>
        {importMessage ? (
          <div className="status-message">
            <Icon name="info" size={17} /> {importMessage}
          </div>
        ) : null}
      </section>

      <section className="medical-boundary">
        <div className="boundary-icon">
          <Icon name="info" size={25} />
        </div>
        <div>
          <span className="eyebrow">حدود الاستخدام</span>
          <h2>سَكينة أداة مساعدة ذاتية، وليست تشخيصًا أو علاجًا طبيًا</h2>
          <p>
            اليقظة المفرطة قد تظهر مع القلق، الضغط المزمن، الصدمات، مشكلات النوم أو أسباب أخرى. عند استمرار
            الأعراض أو تأثيرها على العمل والنوم والعلاقات، اطلب تقييمًا من مختص نفسي أو طبي مؤهل.
          </p>
          <p>
            إذا كنت في خطر مباشر، أو ظهرت أفكار بإيذاء النفس، أو لم تستطع الحفاظ على أمانك، تواصل فورًا مع
            خدمات الطوارئ المحلية أو شخص موثوق، ولا تبق وحدك.
          </p>
        </div>
      </section>

      <section className="developer-note panel-card">
        <div className="developer-note-icon">{'</>'}</div>
        <div>
          <span className="eyebrow">للتطوير القادم</span>
          <h3>البنية الحالية متعمدة أن تكون بسيطة</h3>
          <p>
            يمكنك استبدال Local Storage بـ IndexedDB أو backend، إضافة مصادقة، إشعارات، تقارير أسبوعية، PWA،
            مزامنة، أو تكامل مع معالج-مع الحفاظ على الخصوصية والموافقة الصريحة.
          </p>
        </div>
      </section>
    </div>
  );
}
