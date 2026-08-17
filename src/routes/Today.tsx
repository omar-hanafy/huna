import { useState } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ActivationSlider } from '../components/ActivationSlider';
import { CONTENT, type Locale } from '../content';
import { activeWeek } from '../core/program';
import { createId } from '../lib/id';
import { formatDate } from '../lib/date';
import { useToday } from '../lib/useToday';
import { useNow } from '../lib/useNow';
import { useDay, useDebouncedWrite, usePreferences, useWrite } from '../storage/hooks';
import { CORE_TASK_IDS, createDayRecord, type CoreTaskId } from '../storage/types';
import { ValueCommitmentCard } from '../features/values/ValueCommitmentCard';
import './Today.css';

const BUSY_DAY_TASKS: CoreTaskId[] = ['orientation', 'breathing', 'movement', 'checkins'];

/**
 * The daily routine.
 *
 * There is no streak here and no percentage. Completion is shown as a count so
 * the user can see what is left, not as a score they can fall short of.
 */
export function Today() {
  const { t, i18n } = useTranslation();
  const today = useToday();
  const preferences = usePreferences();
  const day = useDay(today);
  const write = useWrite();
  const { schedule } = useDebouncedWrite();
  const now = useNow();

  const [checkInValue, setCheckInValue] = useState(5);

  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const week = preferences ? activeWeek(preferences, now) : 1;
  const weekContent = CONTENT[locale].program.weeks[week - 1];
  const record = day ?? createDayRecord(today, week);
  const breathingHidden = preferences?.breathing === 'worsens';

  const visibleTasks = (record.busyDay ? BUSY_DAY_TASKS : [...CORE_TASK_IDS]).filter(
    (task) => !(task === 'breathing' && breathingHidden),
  );
  const doneCount = visibleTasks.filter((task) => record.tasks[task]).length;

  const toggleTask = (task: CoreTaskId) => {
    void write((storage) =>
      storage.updateDay(today, { tasks: { ...record.tasks, [task]: !record.tasks[task] } }),
    );
  };

  const addCheckIn = () => {
    const checkIns = [
      ...record.checkIns,
      { id: createId(), createdAt: new Date().toISOString(), activation: checkInValue, note: null },
    ];
    void write((storage) =>
      storage.updateDay(today, {
        checkIns,
        tasks: { ...record.tasks, checkins: checkIns.length >= 3 ? true : record.tasks.checkins },
      }),
    );
  };

  return (
    <div className="screen today">
      <div className="stack stack--tight">
        <span className="eyebrow">{formatDate(today, i18n.language)}</span>
        <h1>{t('today.title')}</h1>
      </div>

      <button
        type="button"
        className="button button--secondary"
        aria-pressed={record.busyDay}
        onClick={() => void write((storage) => storage.updateDay(today, { busyDay: !record.busyDay }))}
      >
        {record.busyDay ? t('today.busyDayOn') : t('today.busyDay')}
      </button>

      <section className="stack">
        <div className="today__head">
          <h2>{weekContent?.title}</h2>
          <span className="step-count">
            {t('today.counter', { done: doneCount, total: visibleTasks.length })}
          </span>
        </div>

        <ul className="task-list">
          {visibleTasks.map((task) => {
            const done = record.tasks[task] ?? false;
            return (
              <li key={task}>
                <button
                  type="button"
                  className={`task ${done ? 'is-done' : ''}`}
                  aria-pressed={done}
                  onClick={() => toggleTask(task)}
                >
                  <span className="task__box" aria-hidden="true">
                    {done ? <Check size={18} strokeWidth={2.5} /> : null}
                  </span>
                  <span className="task__label">{t(`today.tasks.${task}`)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The week's own practice, surfaced only when the program reaches it. */}
      {week === 2 ? (
        <Link className="button button--secondary" to="/journal">
          {t('today.weekFeature.journal')}
        </Link>
      ) : null}
      {week === 3 ? (
        <Link className="button button--secondary" to="/ladder">
          {t('today.weekFeature.ladder')}
        </Link>
      ) : null}
      {week === 4 ? <ValueCommitmentCard date={today} /> : null}

      <section className="card card--calm stack">
        <h2>{t('today.checkInTitle')}</h2>
        <p className="step-count">{t('today.checkInCount', { done: record.checkIns.length, total: 3 })}</p>
        <ActivationSlider
          id="checkin"
          label={t('alert.activationBefore')}
          value={checkInValue}
          onChange={setCheckInValue}
        />
        <button type="button" className="button button--primary button--full" onClick={addCheckIn}>
          {t('today.logCheckIn')}
        </button>
      </section>

      <section className="card stack">
        <h2>{t('today.eveningTitle')}</h2>

        <div className="today__grid">
          <label className="field">
            <span className="field__label">{t('today.sleepHours')}</span>
            <input
              className="input"
              type="number"
              min={0}
              max={24}
              step={0.5}
              defaultValue={record.sleepHours ?? ''}
              onChange={(event) => {
                const value = event.target.value === '' ? null : Number(event.target.value);
                schedule((storage) => storage.updateDay(today, { sleepHours: value }));
              }}
            />
          </label>
          <label className="field">
            <span className="field__label">{t('today.recoveryMinutes')}</span>
            <input
              className="input"
              type="number"
              min={0}
              max={600}
              defaultValue={record.recoveryMinutes ?? ''}
              onChange={(event) => {
                const value = event.target.value === '' ? null : Number(event.target.value);
                schedule((storage) => storage.updateDay(today, { recoveryMinutes: value }));
              }}
            />
          </label>
        </div>

        <ActivationSlider
          id="day-activation"
          label={t('today.dayRating')}
          value={record.activation ?? 5}
          onChange={(value) => void write((storage) => storage.updateDay(today, { activation: value }))}
        />

        <label className="field">
          <span className="field__label">{t('today.helpedToday')}</span>
          <textarea
            className="textarea"
            defaultValue={record.note}
            onChange={(event) => {
              const value = event.target.value;
              schedule((storage) => storage.updateDay(today, { note: value }));
            }}
          />
        </label>

        <p className="muted">{t('today.autosaved')}</p>
      </section>
    </div>
  );
}
