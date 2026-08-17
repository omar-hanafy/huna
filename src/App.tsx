import { useEffect, useMemo, useState } from 'react';
import { AppNav } from './components/AppNav';
import { Icon } from './components/Icon';
import { JournalView } from './components/JournalView';
import { PlanView } from './components/PlanView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { TodayView } from './components/TodayView';
import { ToolsView } from './components/ToolsView';
import { usePersistentState } from './hooks/usePersistentState';
import type { AppSettings, AppState, CheckIn, CoreTaskId, DayRecord, JournalEntry, ViewId, WeekNumber } from './types';
import { createDayRecord, createInitialState, formatArabicDate, STORAGE_KEY, toLocalDateKey } from './utils';

const views: ViewId[] = ['today', 'plan', 'tools', 'journal', 'progress', 'settings'];

function getInitialView(): ViewId {
  const hash = window.location.hash.replace('#/', '') as ViewId;
  return views.includes(hash) ? hash : 'today';
}

export default function App() {
  const [state, setState] = usePersistentState<AppState>(STORAGE_KEY, createInitialState());
  const [activeView, setActiveView] = useState<ViewId>(getInitialView);
  const [navOpen, setNavOpen] = useState(false);
  const todayKey = toLocalDateKey();
  const today = useMemo(
    () => state.days[todayKey] ?? createDayRecord(todayKey, state.activeWeek),
    [state.activeWeek, state.days, todayKey],
  );

  useEffect(() => {
    window.location.hash = `/${activeView}`;
    window.scrollTo({ top: 0, behavior: state.settings.reducedMotion ? 'auto' : 'smooth' });
  }, [activeView, state.settings.reducedMotion]);

  useEffect(() => {
    const onHashChange = () => setActiveView(getInitialView());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  const updateToday = (patch: Partial<DayRecord>) => {
    setState((previous) => {
      const current = previous.days[todayKey] ?? createDayRecord(todayKey, previous.activeWeek);
      return {
        ...previous,
        days: {
          ...previous.days,
          [todayKey]: { ...current, ...patch, date: todayKey },
        },
      };
    });
  };

  const toggleTask = (task: CoreTaskId) => {
    setState((previous) => {
      const current = previous.days[todayKey] ?? createDayRecord(todayKey, previous.activeWeek);
      return {
        ...previous,
        days: {
          ...previous.days,
          [todayKey]: {
            ...current,
            tasks: { ...current.tasks, [task]: !current.tasks[task] },
          },
        },
      };
    });
  };

  const completeTask = (task: CoreTaskId) => {
    setState((previous) => {
      const current = previous.days[todayKey] ?? createDayRecord(todayKey, previous.activeWeek);
      if (current.tasks[task]) return previous;
      return {
        ...previous,
        days: {
          ...previous.days,
          [todayKey]: {
            ...current,
            tasks: { ...current.tasks, [task]: true },
          },
        },
      };
    });
  };

  const addCheckIn = (checkIn: CheckIn) => {
    setState((previous) => {
      const current = previous.days[todayKey] ?? createDayRecord(todayKey, previous.activeWeek);
      const checkIns = [...current.checkIns, checkIn];
      return {
        ...previous,
        days: {
          ...previous.days,
          [todayKey]: {
            ...current,
            checkIns,
            tasks: {
              ...current.tasks,
              checkins: checkIns.length >= 3 ? true : current.tasks.checkins,
            },
          },
        },
      };
    });
  };

  const setWeek = (week: WeekNumber) => {
    setState((previous) => {
      const current = previous.days[todayKey] ?? createDayRecord(todayKey, week);
      return {
        ...previous,
        activeWeek: week,
        days: {
          ...previous.days,
          [todayKey]: { ...current, week },
        },
      };
    });
  };

  const addJournalEntry = (entry: JournalEntry) => {
    setState((previous) => ({ ...previous, journal: [entry, ...previous.journal] }));
  };

  const deleteJournalEntry = (id: string) => {
    setState((previous) => ({ ...previous, journal: previous.journal.filter((entry) => entry.id !== id) }));
  };

  const updateSettings = (patch: Partial<AppSettings>) => {
    setState((previous) => ({
      ...previous,
      settings: { ...previous.settings, ...patch },
    }));
  };

  const importState = (imported: AppState) => {
    setState({
      ...createInitialState(),
      ...imported,
      version: 1,
      settings: { ...createInitialState().settings, ...imported.settings },
    });
  };

  const resetState = () => setState(createInitialState());

  const view = (() => {
    switch (activeView) {
      case 'plan':
        return <PlanView activeWeek={state.activeWeek} onSetWeek={setWeek} />;
      case 'tools':
        return <ToolsView reducedMotion={state.settings.reducedMotion} onCompleteTask={completeTask} />;
      case 'journal':
        return (
          <JournalView
            entries={state.journal}
            onAdd={addJournalEntry}
            onDelete={deleteJournalEntry}
            onMarkFocusComplete={() => completeTask('weekFocus')}
          />
        );
      case 'progress':
        return <ProgressView days={state.days} journal={state.journal} />;
      case 'settings':
        return (
          <SettingsView
            state={state}
            settings={state.settings}
            onUpdateSettings={updateSettings}
            onImport={importState}
            onReset={resetState}
          />
        );
      case 'today':
      default:
        return (
          <TodayView
            dateKey={todayKey}
            day={today}
            activeWeek={state.activeWeek}
            onToggleTask={toggleTask}
            onUpdateDay={updateToday}
            onAddCheckIn={addCheckIn}
            onNavigate={setActiveView}
          />
        );
    }
  })();

  return (
    <div className={`app-shell ${state.settings.compactMode ? 'compact-mode' : ''} ${state.settings.reducedMotion ? 'reduce-motion' : ''}`}>
      <AppNav activeView={activeView} onNavigate={setActiveView} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="app-main">
        <header className="mobile-header">
          <button className="icon-button" type="button" onClick={() => setNavOpen(true)} aria-label="فتح القائمة">
            <Icon name="menu" />
          </button>
          <div className="mobile-brand">
            <span className="mini-brand-mark" />
            <strong>سَكينة</strong>
          </div>
          <span className="mobile-date">{formatArabicDate(todayKey, { day: 'numeric', month: 'short' })}</span>
        </header>

        <main className="content-wrap">{view}</main>

        <footer className="app-footer">
          <div><span className="mini-brand-mark" /><strong>سَكينة</strong></div>
          <p>أداة مساعدة ذاتية، وليست بديلًا عن التشخيص أو العلاج المهني.</p>
          <button type="button" onClick={() => setActiveView('settings')}>حدود الاستخدام والخصوصية</button>
        </footer>
      </div>
    </div>
  );
}
