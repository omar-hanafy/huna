import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { lockoutState } from '../core/safety-window';
import { formatTime } from '../lib/date';
import { createId } from '../lib/id';
import { useNow } from '../lib/useNow';
import { useLastSafetyCheck, usePreferences, useWrite } from '../storage/hooks';
import './CheckOnce.css';

const TARGETS = ['door', 'phone', 'exit', 'windows', 'custom'] as const;

/**
 * Check once.
 *
 * The urge to re-check a lock, a phone, or an exit is the loop this screen
 * addresses. Logging a check creates a timestamped seal, so the next urge has
 * something to answer it: you checked, here is when.
 *
 * It never refuses a second check. Refusing would require knowing that nothing
 * has changed, which the app cannot know, and being locked out by software
 * during a surge is its own kind of alarm. Inside the reminder window it shows
 * the seal and two honest choices, and both of them work.
 */
export function CheckOnce() {
  const { t, i18n } = useTranslation();
  const preferences = usePreferences();
  const lastCheck = useLastSafetyCheck();
  const write = useWrite();
  const now = useNow();
  const [custom, setCustom] = useState('');

  const lockout =
    preferences && lastCheck !== undefined
      ? lockoutState(lastCheck, now, preferences.lockoutMinutes)
      : { active: false, minutesAgo: null, lastCheck: null };

  const [acknowledged, setAcknowledged] = useState(false);
  const [logged, setLogged] = useState<string | null>(null);

  const label = (target: string) =>
    t(`safetyChecks.targets.${target}`, { defaultValue: target });

  const log = (target: string) => {
    void write((storage) =>
      storage.saveSafetyCheck({
        id: createId(),
        at: new Date().toISOString(),
        target,
        source: 'manual',
      }),
    );
    setAcknowledged(false);
    setLogged(target);
    setCustom('');
  };

  const showSeal = lockout.active && !acknowledged;

  return (
    <div className="screen screen--narrow check-once">
      <div className="stack stack--tight">
        <h1>{t('safetyChecks.title')}</h1>
        <p className="lede">{t('safetyChecks.helper')}</p>
      </div>

      {/* With the reminder window off there is no seal to confirm the tap, so
          say plainly that the check was recorded. */}
      {logged && !showSeal ? (
        <p className="banner" role="status">
          {t('safetyChecks.logCheck', { target: label(logged) })}
        </p>
      ) : null}

      {showSeal && lockout.lastCheck ? (
        <section className="card card--calm stack">
          <span className="eyebrow">{t('alert.seal.title')}</span>
          <p>
            {t('safetyChecks.lastCheck', {
              target: label(lockout.lastCheck.target),
              count: lockout.minutesAgo ?? 0,
            })}
          </p>
          <p className="muted">
            {t('alert.seal.checkedAt', {
              time: formatTime(lockout.lastCheck.at, i18n.language),
              count: lockout.minutesAgo ?? 0,
            })}
          </p>

          {/* Both choices work. Neither is styled as the correct one. */}
          <div className="stack">
            <button type="button" className="choice" onClick={() => setAcknowledged(true)}>
              <span className="choice__title">{t('safetyChecks.letThePassPass')}</span>
            </button>
            <button type="button" className="choice" onClick={() => setAcknowledged(true)}>
              <span className="choice__title">{t('alert.seal.somethingChanged')}</span>
            </button>
          </div>

          <p className="muted">{t('alert.seal.neverBlocked')}</p>
        </section>
      ) : null}

      <section className="stack">
        <h2 className="eyebrow">{t('safetyChecks.whatDidYouCheck')}</h2>
        <div className="check-grid">
          {TARGETS.filter((target) => target !== 'custom').map((target) => (
            <button key={target} type="button" className="choice" onClick={() => log(target)}>
              <span className="choice__title">{label(target)}</span>
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="custom-check">{t('safetyChecks.targets.custom')}</label>
          <input
            id="custom-check"
            className="input"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
          />
          <button
            type="button"
            className="button button--secondary"
            disabled={custom.trim().length === 0}
            onClick={() => log(custom.trim())}
          >
            {t('common.add')}
          </button>
        </div>
      </section>

      <p className="banner">{t('safetyChecks.realDanger')}</p>
    </div>
  );
}
