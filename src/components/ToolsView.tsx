import { useState } from 'react';
import type { CoreTaskId } from '../types';
import { BreathingTool } from './BreathingTool';
import { GroundingTool } from './GroundingTool';
import { Icon } from './Icon';
import { RelaxationTool } from './RelaxationTool';

interface ToolsViewProps {
  reducedMotion: boolean;
  onCompleteTask: (task: CoreTaskId) => void;
}

type ToolId = 'breathing' | 'grounding' | 'relaxation';

export function ToolsView({ reducedMotion, onCompleteTask }: ToolsViewProps) {
  const [activeTool, setActiveTool] = useState<ToolId>('breathing');

  return (
    <div className="view-stack">
      <section className="page-intro tools-intro">
        <div>
          <span className="eyebrow">استخدم ما يناسب اللحظة</span>
          <h1>
            ثلاث أدوات.
            <br />
            ولا واحدة منها إجبارية.
          </h1>
          <p>
            جرّب الأداة التي تجعل انتباهك أوسع. لو أداة زادت التوتر، أوقفها واستخدم أخرى أو ارجع لنشاط بسيط
            وآمن.
          </p>
        </div>
        <div className="tool-orbs" aria-hidden="true">
          <span>
            <Icon name="wind" />
          </span>
          <span>
            <Icon name="compass" />
          </span>
          <span>
            <Icon name="sparkles" />
          </span>
        </div>
      </section>

      <div className="tool-tabs" role="tablist" aria-label="أدوات التنظيم">
        <button
          className={activeTool === 'breathing' ? 'is-active' : ''}
          type="button"
          onClick={() => setActiveTool('breathing')}
          role="tab"
          aria-selected={activeTool === 'breathing'}
        >
          <Icon name="wind" size={18} />
          التنفّس
          <span>هدوء الإيقاع</span>
        </button>
        <button
          className={activeTool === 'grounding' ? 'is-active' : ''}
          type="button"
          onClick={() => setActiveTool('grounding')}
          role="tab"
          aria-selected={activeTool === 'grounding'}
        >
          <Icon name="compass" size={18} />
          الحواس
          <span>عودة للحاضر</span>
        </button>
        <button
          className={activeTool === 'relaxation' ? 'is-active' : ''}
          type="button"
          onClick={() => setActiveTool('relaxation')}
          role="tab"
          aria-selected={activeTool === 'relaxation'}
        >
          <Icon name="sparkles" size={18} />
          العضلات
          <span>إرخاء التوتر</span>
        </button>
      </div>

      <div role="tabpanel">
        {activeTool === 'breathing' ? (
          <BreathingTool reducedMotion={reducedMotion} onComplete={() => onCompleteTask('breathing')} />
        ) : null}
        {activeTool === 'grounding' ? (
          <GroundingTool onComplete={() => onCompleteTask('orientation')} />
        ) : null}
        {activeTool === 'relaxation' ? (
          <RelaxationTool onComplete={() => onCompleteTask('relaxation')} />
        ) : null}
      </div>

      <section className="choose-tool-guide">
        <div className="guide-head">
          <span className="eyebrow">مش عارف تبدأ بإيه؟</span>
          <h2>اختيار سريع حسب حالتك</h2>
        </div>
        <div className="guide-grid">
          <article>
            <span className="guide-icon mint">
              <Icon name="wind" />
            </span>
            <h3>النفس سريع أو سطحي</h3>
            <p>ابدأ بالتنفّس الخفيف. لا تأخذ شهيقًا عميقًا بالقوة.</p>
          </article>
          <article>
            <span className="guide-icon lilac">
              <Icon name="compass" />
            </span>
            <h3>عقلك يفتش عن تهديد</h3>
            <p>استخدم الحواس وحدد ما هو موجود فعلًا في المكان الآن.</p>
          </article>
          <article>
            <span className="guide-icon peach">
              <Icon name="sparkles" />
            </span>
            <h3>الفك والكتفان مشدودان</h3>
            <p>استخدم الشد الخفيف ثم الإرخاء، وتجنب أي منطقة تؤلمك.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
