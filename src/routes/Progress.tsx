import { useTranslation } from 'react-i18next';
import {
  MIN_SESSIONS_FOR_RATE,
  checksPerDay,
  medianActivationDrop,
  medianSessionMinutes,
  returnToLifeStats,
  sessionsUnderTwoMinutes,
} from '../core/recovery-metrics';
import { formatDate } from '../lib/date';
import { useNow } from '../lib/useNow';
import { useAlertSessions, useLive, usePreferences, useWrite } from '../storage/hooks';
import './Progress.css';

/**
 * A kind look at the numbers.
 *
 * Two rules shape this screen. It is not reachable from the tab bar, because
 * numbers on the way to everything else invite the body-monitoring the app is
 * trying to reduce. And every figure here measures recovery, never danger: no
 * physiological state is ever paired with a clock time, because "your nervous
 * system was under strain at 3:42pm" invites more watching and offers nothing
 * to do about it.
 *
 * The streak is gone. It reset to zero every morning before the first task,
 * which is a machine telling someone they have already failed today.
 */
export function Progress() {
  const { t, i18n } = useTranslation();
  const preferences = usePreferences();
  const sessions = useAlertSessions();
  const checks = useLive((storage) => storage.getSafetyChecks());
  const write = useWrite();
  const now = useNow();

  // Everything below reads three live queries. Rendering before they land
  // showed a full page of dashes and zeroes to someone who came here for a
  // trend, so wait the one frame out.
  if (preferences === undefined || sessions === undefined || checks === undefined) {
    return <div className="screen screen--narrow progress" aria-busy="true" />;
  }

  if (!preferences.showMetrics) {
    return (
      <div className="screen screen--narrow progress">
        <h1>{t('progress.title')}</h1>
        <p className="lede">{t('progress.hidden')}</p>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void write((storage) => storage.savePreferences({ showMetrics: true }))}
        >
          {t('progress.show')}
        </button>
      </div>
    );
  }

  const all = sessions;
  const stats = returnToLifeStats(all);
  const median = medianSessionMinutes(all);
  const drop = medianActivationDrop(all);
  const short = sessionsUnderTwoMinutes(all);
  const daily = checksPerDay(checks, now, 14);
  const maxChecks = Math.max(1, ...daily.map((day) => day.count));

  const thisWeek = all.filter(
    (session) => new Date(session.startedAt).getTime() > now.getTime() - 7 * 86_400_000,
  ).length;

  return (
    <div className="screen progress">
      <div className="stack stack--tight">
        <h1>{t('progress.title')}</h1>
        <p className="lede">{t('progress.helper')}</p>
      </div>

      <section className="card card--calm stack">
        <span className="eyebrow">{t('progress.returnToLife')}</span>
        {stats.rate === null ? (
          <>
            <p className="metric-value">{t('progress.tooEarly')}</p>
            <p className="muted">
              {t('progress.tooEarlyExplain')} ({stats.answered}/{MIN_SESSIONS_FOR_RATE})
            </p>
          </>
        ) : (
          <>
            <p className="metric-value">{Math.round(stats.rate * 100)}%</p>
            <p className="muted">{t('progress.returnToLifeExplain')}</p>
          </>
        )}
      </section>

      <div className="metric-grid">
        <article className="card stack stack--tight">
          <span className="eyebrow">{t('progress.medianRecovery')}</span>
          <strong className="metric-value">{median === null ? '-' : median.toFixed(1)}</strong>
        </article>
        <article className="card stack stack--tight">
          <span className="eyebrow">{t('progress.underTwoMinutes')}</span>
          <strong className="metric-value">
            {short.total === 0 ? '-' : `${short.count}/${short.total}`}
          </strong>
        </article>
        <article className="card stack stack--tight">
          <span className="eyebrow">{t('progress.activationDrop')}</span>
          <strong className="metric-value">{drop === null ? '-' : drop.toFixed(1)}</strong>
        </article>
      </div>

      {/* Not a streak. A count, with a question attached rather than a target. */}
      <section className="card card--warm">
        <p>{t('progress.practisedThisWeek', { count: thisWeek })}</p>
      </section>

      <section className="card stack">
        <span className="eyebrow">{t('progress.repeatChecks')}</span>
        <div className="check-chart" aria-hidden="true">
          {daily.map((day) => (
            <div key={day.date} className="check-chart__column">
              <span style={{ blockSize: `${(day.count / maxChecks) * 100}%` }} />
            </div>
          ))}
        </div>
        {/* The chart is decorative; this table is the accessible source. */}
        <table className="data-table">
          <caption className="sr-only">{t('progress.chartTable')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('nav.today')}</th>
              <th scope="col">{t('progress.repeatChecks')}</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((day) => (
              <tr key={day.date}>
                <th scope="row">{formatDate(day.date, i18n.language, { day: 'numeric', month: 'short' })}</th>
                <td>{day.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <h2>{t('progress.weeklyQuestions.title')}</h2>
        <ol className="weekly-questions">
          <li>{t('progress.weeklyQuestions.one')}</li>
          <li>{t('progress.weeklyQuestions.two')}</li>
          <li>{t('progress.weeklyQuestions.three')}</li>
        </ol>
      </section>
    </div>
  );
}
