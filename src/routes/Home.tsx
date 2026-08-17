import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { activeWeek } from '../core/program';
import { useDay, usePreferences } from '../storage/hooks';
import { useToday } from '../lib/useToday';
import { useNow } from '../lib/useNow';
import './Home.css';

/**
 * Home is not a dashboard.
 *
 * One large action, today's routine folded underneath it, and nothing else
 * asking to be looked at. Progress is deliberately absent: numbers on the first
 * screen invite the monitoring this app is trying to reduce, so they live
 * behind a deliberate choice in settings.
 */
export function Home() {
  const { t } = useTranslation();
  const preferences = usePreferences();
  const today = useToday();
  const day = useDay(today);
  const now = useNow();

  const week = preferences ? activeWeek(preferences, now) : 1;
  const doneCount = day ? Object.values(day.tasks).filter(Boolean).length : 0;

  return (
    <div className="screen home">
      {/*
        The button carries a grounding mark, not a warning symbol. The label
        already says what the state is; the icon says what happens next.
      */}
      <Link to="/alert" className="alert-button">
        <span className="alert-button__mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="24" cy="24" r="16" />
            <circle cx="24" cy="24" r="4.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="alert-button__text">
          <strong>{t('home.alertButton')}</strong>
          <small>{t('home.alertHint')}</small>
        </span>
      </Link>

      <section className="card home-routine">
        <div className="home-routine__head">
          <div>
            <span className="eyebrow">{t('home.weekChip', { week })}</span>
            <h2>{t('home.todayStep')}</h2>
          </div>
          <span className="step-count">{t('today.counter', { done: doneCount, total: 6 })}</span>
        </div>
        <Link className="button button--secondary" to="/today">
          {t('nav.today')}
        </Link>
      </section>

      <nav className="home-links" aria-label={t('nav.home')}>
        <Link className="button button--quiet" to="/tools">
          {t('home.practise')}
        </Link>
        <Link className="button button--quiet" to="/card">
          {t('home.openCard')}
        </Link>
        <Link className="button button--quiet" to="/check">
          {t('safetyChecks.title')}
        </Link>
        <Link className="button button--quiet" to="/program">
          {t('nav.program')}
        </Link>
      </nav>
    </div>
  );
}
