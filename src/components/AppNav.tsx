import { Icon } from './Icon';
import type { ViewId } from '../types';

interface AppNavProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  open: boolean;
  onClose: () => void;
}

const items: Array<{
  id: ViewId;
  label: string;
  description: string;
  icon: Parameters<typeof Icon>[0]['name'];
}> = [
  { id: 'today', label: 'اليوم', description: 'روتينك الحالي', icon: 'home' },
  { id: 'plan', label: 'الخطة', description: 'أربعة أسابيع', icon: 'calendar' },
  { id: 'tools', label: 'الأدوات', description: 'تنفّس وتثبيت', icon: 'tools' },
  { id: 'journal', label: 'السجل', description: 'فهم المحفزات', icon: 'journal' },
  { id: 'progress', label: 'التقدّم', description: 'نظرة رحيمة', icon: 'chart' },
  { id: 'settings', label: 'الإعدادات', description: 'بيانات وتجربة', icon: 'settings' },
];

export function AppNav({ activeView, onNavigate, open, onClose }: AppNavProps) {
  const navigate = (view: ViewId) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      <button
        className={`nav-backdrop ${open ? 'is-visible' : ''}`}
        onClick={onClose}
        aria-label="إغلاق القائمة"
        type="button"
      />
      <aside className={`app-nav ${open ? 'is-open' : ''}`} aria-label="التنقل الرئيسي">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-orbit" />
            <span className="brand-core" />
          </div>
          <div>
            <strong>سَكينة</strong>
            <span>رفيق يومي لطيف</span>
          </div>
          <button
            className="icon-button nav-close"
            type="button"
            onClick={onClose}
            aria-label="إغلاق القائمة"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav-list">
          {items.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'is-active' : ''}`}
              onClick={() => navigate(item.id)}
              type="button"
              aria-current={activeView === item.id ? 'page' : undefined}
            >
              <span className="nav-icon">
                <Icon name={item.icon} />
              </span>
              <span className="nav-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <Icon className="nav-chevron" name="chevron" size={17} />
            </button>
          ))}
        </nav>

        <div className="nav-note">
          <span className="nav-note-icon">
            <Icon name="heart" size={18} />
          </span>
          <p>الهدف مش إنك تبقى هادئ 100٪. الهدف إنك ترجع لنفسك أسرع، وبضغط أقل.</p>
        </div>

        <div className="nav-footer">
          <span>بياناتك محفوظة على جهازك فقط</span>
          <span className="privacy-dot" aria-hidden="true" />
        </div>
      </aside>
    </>
  );
}
