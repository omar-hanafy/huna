import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivationSlider } from '../../components/ActivationSlider';
import { applyFollowUp, expiredFollowUps, markMissed, pendingFollowUp } from '../../core/follow-up';
import { useNow } from '../../lib/useNow';
import { useAlertSessions, useWrite } from '../../storage/hooks';
import type { AlertSession } from '../../storage/types';
import './followUp.css';

/**
 * The single follow-up after an alert session.
 *
 * It asks once, on the next app open between five and sixty minutes after the
 * session ended, and then never again. Dismissing it is not answering: the
 * window stays open until it expires on its own.
 *
 * A session whose window closed unanswered is marked missed, which removes it
 * from the return-to-life denominator entirely. Counting a forgotten prompt as
 * a failed action would turn ordinary life into evidence of getting worse.
 */
export function FollowUpPrompt() {
  const { t } = useTranslation();
  const sessions = useAlertSessions();
  const write = useWrite();
  // A minute of granularity is enough for a five-minute window.
  const now = useNow(60_000);

  const [dismissed, setDismissed] = useState<string[]>([]);
  const [activation, setActivation] = useState(5);
  const [helped, setHelped] = useState('');

  // Close out anything whose window has passed, so it is never asked about.
  useEffect(() => {
    if (!sessions) return;
    const expired = expiredFollowUps(sessions, now);
    for (const session of expired) {
      void write((storage) => storage.saveAlertSession(markMissed(session)));
    }
  }, [sessions, write, now]);

  const pending = sessions ? pendingFollowUp(sessions, now) : null;
  if (!pending || dismissed.includes(pending.id)) return null;

  const answer = (completed: AlertSession['actionCompleted']) => {
    const updated = applyFollowUp(
      pending,
      { activationAfter: activation, actionCompleted: completed, whatHelped: helped.trim() || null },
      new Date(),
    );
    void write((storage) => storage.saveAlertSession(updated));
  };

  return (
    <aside className="follow-up" role="dialog" aria-labelledby="follow-up-title">
      <div className="follow-up__inner">
        <div className="stack stack--tight">
          <h2 id="follow-up-title">{t('alert.followUp.title')}</h2>
          <p className="muted">{t('alert.followUp.body')}</p>
        </div>

        <ActivationSlider
          id="follow-up-activation"
          label={t('alert.followUp.activationAfter')}
          value={activation}
          onChange={setActivation}
        />

        {pending.chosenAction ? (
          <div className="stack stack--tight">
            <p className="field__label">{t('alert.followUp.completedAction')}</p>
            <p className="muted">{pending.chosenAction}</p>
            <div className="follow-up__answers">
              <button type="button" className="button button--secondary" onClick={() => answer('yes')}>
                {t('alert.followUp.yes')}
              </button>
              <button type="button" className="button button--secondary" onClick={() => answer('partly')}>
                {t('alert.followUp.partly')}
              </button>
              <button type="button" className="button button--secondary" onClick={() => answer('no')}>
                {t('alert.followUp.no')}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="button button--primary button--full" onClick={() => answer(null)}>
            {t('common.save')}
          </button>
        )}

        <label className="field">
          <span className="field__label">{t('alert.followUp.whatHelped')}</span>
          <input className="input" value={helped} onChange={(event) => setHelped(event.target.value)} />
        </label>

        {/* Dismissing leaves the window open; it is not recorded as an answer. */}
        <button
          type="button"
          className="button button--quiet"
          onClick={() => setDismissed((current) => [...current, pending.id])}
        >
          {t('alert.followUp.dismiss')}
        </button>
      </div>
    </aside>
  );
}
