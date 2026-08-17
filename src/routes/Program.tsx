import { useTranslation } from 'react-i18next';
import { CONTENT, type Locale } from '../content';
import { activeWeek, isOverridden, suggestedWeek } from '../core/program';
import { usePreferences, useWrite } from '../storage/hooks';
import type { WeekNumber } from '../storage/types';
import './Program.css';

/**
 * The four-week program.
 *
 * Weeks are suggested, never locked. Someone who wants week three on day two
 * gets week three, and someone returning after a gap is not told they are
 * behind. Locking would contradict the agency the rest of the app is built on.
 */
export function Program() {
  const { t, i18n } = useTranslation();
  const preferences = usePreferences();
  const write = useWrite();

  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const weeks = CONTENT[locale].program.weeks;
  const now = new Date();
  const suggested = preferences ? suggestedWeek(preferences.programStartedAt, now) : 1;
  const current = preferences ? activeWeek(preferences, now) : 1;
  const overridden = preferences ? isOverridden(preferences) : false;

  const choose = (week: WeekNumber) => {
    void write((storage) => storage.savePreferences({ weekOverride: week === suggested ? null : week }));
  };

  return (
    <div className="screen program">
      <div className="stack stack--tight">
        <h1>{t('program.title')}</h1>
      </div>

      <div className="week-tabs" role="tablist" aria-label={t('program.title')}>
        {weeks.map((week) => (
          <button
            key={week.number}
            type="button"
            role="tab"
            aria-selected={current === week.number}
            onClick={() => choose(week.number)}
          >
            {week.number}
            {week.number === suggested ? <span className="week-tabs__dot" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>

      {overridden ? (
        <p className="muted">
          {t('program.suggested')}: {suggested}
        </p>
      ) : null}

      {weeks
        .filter((week) => week.number === current)
        .map((week) => (
          <article key={week.number} className={`card week-card week-card--${week.accent}`}>
            <span className="eyebrow">{week.eyebrow}</span>
            <h2>{week.title}</h2>
            <p className="lede">{week.description}</p>

            <div className="stack stack--tight">
              <h3 className="eyebrow">{t('program.focusTask')}</h3>
              <p>{week.focusTask}</p>
            </div>

            <div className="stack stack--tight">
              <h3 className="eyebrow">{t('program.daily')}</h3>
              <ul>
                {week.daily.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="stack stack--tight">
              <h3 className="eyebrow">{t('program.avoid')}</h3>
              <ul>
                {week.avoid.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <p className="muted">
              {t('program.outcome')}: {week.outcome}
            </p>
          </article>
        ))}
    </div>
  );
}
