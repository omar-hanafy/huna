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

  const [active, setActive] = useState<ToolId>('breathing');

  // Preferences arrive a tick after the first render. Deciding the default tab
  // from that first render left the breathing tab selected but its panel empty
  // once "breathing makes it worse" loaded, so the whole screen looked broken.
  if (preferences === undefined) return <div className="screen tools" aria-busy="true" />;

  const breathingAvailable = preferences.breathing !== 'worsens';
  const shown: ToolId = active === 'breathing' && !breathingAvailable ? 'grounding' : active;

  const completeTask = (task: CoreTaskId) => {
    void write((storage) =>
      storage.updateDay(today, (current) => ({
        tasks: { ...createEmptyTasks(), ...current.tasks, [task]: true },
      })),
    );
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

      {/*
        Plain toggle buttons rather than ARIA tabs: real tabs owe the user
        arrow-key navigation and a wired-up panel relationship, and a half-built
        tablist reads worse to a screen reader than an honest set of buttons.
      */}
      <div className="tool-tabs" role="group" aria-label={t('tools.title')}>
        {tabs.map((id) => (
          <button key={id} type="button" aria-pressed={shown === id} onClick={() => setActive(id)}>
            {t(`tools.${id}`)}
          </button>
        ))}
      </div>

      <div>
        {shown === 'breathing' ? (
          <BreathingTool
            reducedMotion={preferences.reducedMotion}
            onComplete={() => completeTask('breathing')}
          />
        ) : null}
        {shown === 'grounding' ? <GroundingTool onComplete={() => completeTask('orientation')} /> : null}
        {shown === 'relaxation' ? <RelaxationTool onComplete={() => completeTask('relaxation')} /> : null}
      </div>
    </div>
  );
}
