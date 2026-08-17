import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BreathingTool } from '../features/tools/BreathingTool';
import { GroundingTool } from '../features/tools/GroundingTool';
import { RelaxationTool } from '../features/tools/RelaxationTool';
import { useToday } from '../lib/useToday';
import { usePreferences, useWrite } from '../storage/hooks';
import { createEmptyTasks, type CoreTaskId } from '../storage/types';

type ToolId = 'breathing' | 'grounding' | 'relaxation';

/**
 * Practice, not emergency.
 *
 * These are the tools to run in a calm moment so the body already knows them.
 * The alert flow does not send anyone here: during a surge it runs its own
 * short sequence rather than offering a choice between exercises.
 *
 * If the user said breathing makes things worse, the breathing tool is not here
 * at all. Showing it greyed out would still put the idea in front of them.
 */
export function Tools() {
  const { t } = useTranslation();
  const preferences = usePreferences();
  const write = useWrite();
  const today = useToday();

  const breathingAvailable = preferences?.breathing !== 'worsens';
  const [active, setActive] = useState<ToolId>(breathingAvailable ? 'breathing' : 'grounding');

  const completeTask = (task: CoreTaskId) => {
    void write(async (storage) => {
      const day = await storage.getDay(today);
      const tasks = { ...createEmptyTasks(), ...day?.tasks, [task]: true };
      return storage.updateDay(today, { tasks });
    });
  };

  const tabs: ToolId[] = breathingAvailable
    ? ['breathing', 'grounding', 'relaxation']
    : ['grounding', 'relaxation'];

  return (
    <div className="screen tools">
      <div className="stack stack--tight">
        <h1>{t('tools.title')}</h1>
        <p className="lede">{t('tools.helper')}</p>
      </div>

      {!breathingAvailable ? <p className="banner">{t('tools.breathingHidden')}</p> : null}

      <div className="tool-tabs" role="tablist" aria-label={t('tools.title')}>
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => setActive(id)}
          >
            {t(`tools.${id}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === 'breathing' && breathingAvailable ? (
          <BreathingTool
            reducedMotion={preferences?.reducedMotion ?? false}
            onComplete={() => completeTask('breathing')}
          />
        ) : null}
        {active === 'grounding' ? <GroundingTool onComplete={() => completeTask('orientation')} /> : null}
        {active === 'relaxation' ? <RelaxationTool onComplete={() => completeTask('relaxation')} /> : null}
      </div>
    </div>
  );
}
