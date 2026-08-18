import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivationSlider } from '../../components/ActivationSlider';
import {
  applyFollowUp,
  coveredByAnswer,
  expiredFollowUps,
  markMissed,
  pendingFollowUp,
} from '../../core/follow-up';
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
 *
 * One answer closes every other open follow-up. Two hard hours used to produce
 * two prompts back to back, which is an interrogation rather than a check-in.
 */
export function FollowUpPrompt() {
  const sessions = useAlertSessions();
  const write = useWrite();
  // A minute of granularity is enough for a five-minute window.
  const now = useNow(60_000);

  /**
   * Sessions this visit has finished with: answered, closed by an answer, or
   * put off. Tracked here as well as in storage because the writes land a beat
   * later, and in that beat the prompt would otherwise pop straight back up for
   * a session the user has just dealt with.
   */
  const [closed, setClosed] = useState<string[]>([]);
  /**
   * The session whose prompt is on screen.
   *
   * Held so the prompt survives its own window closing: it used to vanish
   * mid-sentence at the sixty-minute mark, discarding whatever the user had
   * already typed. The dialog reports itself on mount rather than the parent
   * guessing, so "shown" means shown.
   */
  const [held, setHeld] = useState<string | null>(null);
  const hold = useCallback((id: string) => setHeld(id), []);

  const due = sessions ? pendingFollowUp(sessions, now) : null;
  const heldSession = held && sessions ? (sessions.find((session) => session.id === held) ?? null) : null;

  const stillOpen = (session: AlertSession) =>
    session.followUpAnsweredAt === null && !session.followUpMissed && !closed.includes(session.id);

  const active = heldSession && stillOpen(heldSession) ? heldSession : due && stillOpen(due) ? due : null;

  // Close out anything whose window has passed, so it is never asked about.
  // The one on screen is exempt: it is being answered right now.
  useEffect(() => {
    if (!sessions) return;
    for (const session of expiredFollowUps(sessions, now)) {
      if (session.id === held) continue;
      void write((storage) => storage.saveAlertSession(markMissed(session)));
    }
  }, [sessions, write, now, held]);

  if (!active || !sessions) return null;

  const answer = (
    completed: AlertSession['actionCompleted'],
    activation: number,
    whatHelped: string | null,
  ) => {
    const at = new Date();
    const updated = applyFollowUp(
      active,
      { activationAfter: activation, actionCompleted: completed, whatHelped },
      at,
    );
    const covered = coveredByAnswer(sessions, active, at);
    setClosed((current) => [...current, active.id, ...covered.map((session) => session.id)]);
    setHeld(null);
    void write(async (storage) => {
      await storage.saveAlertSession(updated);
      for (const session of covered) await storage.saveAlertSession(markMissed(session));
    });
  };

  const dismiss = () => {
    setClosed((current) => [...current, active.id]);
    setHeld(null);
  };

  // Keyed by session so the slider and the note never carry over from the
  // episode before this one.
  return (
    <FollowUpDialog key={active.id} session={active} onShown={hold} onAnswer={answer} onDismiss={dismiss} />
  );
}

interface FollowUpDialogProps {
  session: AlertSession;
  onShown: (id: string) => void;
  onAnswer: (
    completed: AlertSession['actionCompleted'],
    activation: number,
    whatHelped: string | null,
  ) => void;
  onDismiss: () => void;
}

/** True while the caret is in something the user is writing in. */
function isTyping(element: Element | null): boolean {
  return (
    element instanceof HTMLElement &&
    (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable)
  );
}

function FollowUpDialog({ session, onShown, onAnswer, onDismiss }: FollowUpDialogProps) {
  const { t } = useTranslation();
  const [activation, setActivation] = useState(5);
  const [helped, setHelped] = useState('');
  const title = useRef<HTMLHeadingElement>(null);

  /**
   * The prompt appears on top of whatever screen the user opened, so focus has
   * to follow it or a screen reader never learns it is there.
   *
   * Unless the user is in the middle of writing something. This can arrive on a
   * clock tick, and yanking the caret out of a half-written journal entry to
   * ask an optional question is exactly the interruption the whole feature is
   * trying not to be. In that case it is announced instead, which tells a
   * screen-reader user it is there without taking the keyboard from them.
   */
  const [announceOnly] = useState(() => isTyping(document.activeElement));

  useEffect(() => {
    onShown(session.id);
    if (!announceOnly) title.current?.focus();
  }, [announceOnly, onShown, session.id]);

  const answer = (completed: AlertSession['actionCompleted']) => {
    onAnswer(completed, activation, helped.trim() || null);
  };

  return (
    <aside className="follow-up" role="dialog" aria-labelledby="follow-up-title">
      <div className="follow-up__inner">
        {announceOnly ? (
          <p className="sr-only" role="status">
            {t('alert.followUp.title')}
          </p>
        ) : null}
        <div className="stack stack--tight">
          <h2 id="follow-up-title" ref={title} tabIndex={-1}>
            {t('alert.followUp.title')}
          </h2>
          <p className="muted">{t('alert.followUp.body')}</p>
        </div>

        <ActivationSlider
          id="follow-up-activation"
          label={t('alert.followUp.activationAfter')}
          value={activation}
          onChange={setActivation}
        />

        {session.chosenAction ? (
          <div className="stack stack--tight">
            <p className="field__label">{t('alert.followUp.completedAction')}</p>
            <p className="muted">{session.chosenAction}</p>
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
        <button type="button" className="button button--quiet" onClick={onDismiss}>
          {t('alert.followUp.dismiss')}
        </button>
      </div>
    </aside>
  );
}
