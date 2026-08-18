import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ActivationSlider } from '../components/ActivationSlider';
import { formatDateTime } from '../lib/date';
import { createId } from '../lib/id';
import { useJournalEntries, useWrite } from '../storage/hooks';
import { clampMinutesValue } from '../storage/types';
import './Journal.css';

const FIELDS = ['trigger', 'prediction', 'evidenceDanger', 'evidenceAlarm', 'response'] as const;
type Field = (typeof FIELDS)[number];

const EMPTY: Record<Field, string> = {
  trigger: '',
  prediction: '',
  evidenceDanger: '',
  evidenceAlarm: '',
  response: '',
};

/**
 * The trigger log.
 *
 * One entry a day is the intent, not a complete record. The prompts are
 * deliberately neutral: "what did your mind predict" rather than "what was
 * irrational about your thought". Someone whose alarm is oversensitive does not
 * need a form that argues with them, and calling a prediction irrational is
 * both unkind and often wrong.
 *
 * Both evidence fields are asked for together, so the exercise is noticing
 * rather than winning an argument in either direction.
 */
export function Journal() {
  const { t, i18n } = useTranslation();
  const entries = useJournalEntries();
  const write = useWrite();

  const [draft, setDraft] = useState<Record<Field, string>>(EMPTY);
  const [before, setBefore] = useState(7);
  const [after, setAfter] = useState(5);
  const [recovery, setRecovery] = useState('');
  const [armedForDelete, setArmedForDelete] = useState<string | null>(null);

  const canSave = FIELDS.some((field) => draft[field].trim().length > 0);

  const save = () => {
    void write((storage) =>
      storage.saveJournalEntry({
        id: createId(),
        createdAt: new Date().toISOString(),
        trigger: draft.trigger.trim(),
        prediction: draft.prediction.trim(),
        evidenceDanger: draft.evidenceDanger.trim(),
        evidenceAlarm: draft.evidenceAlarm.trim(),
        response: draft.response.trim(),
        // Clamped at the write site: an out-of-range number stored today makes
        // the whole backup unrestorable later.
        recoveryMinutes: recovery === '' ? null : clampMinutesValue(Number(recovery)),
        intensityBefore: before,
        intensityAfter: after,
      }),
    );
    setDraft(EMPTY);
    setRecovery('');
  };

  return (
    <div className="screen journal">
      <div className="stack stack--tight">
        <h1>{t('journal.title')}</h1>
        <p className="lede">{t('journal.helper')}</p>
      </div>

      <section className="card stack">
        {FIELDS.map((field) => (
          <label key={field} className="field">
            <span className="field__label">{t(`journal.${field}`)}</span>
            <textarea
              className="textarea"
              rows={2}
              value={draft[field]}
              onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
            />
          </label>
        ))}

        <ActivationSlider
          id="journal-before"
          label={t('journal.intensityBefore')}
          value={before}
          onChange={setBefore}
        />
        <ActivationSlider
          id="journal-after"
          label={t('journal.intensityAfter')}
          value={after}
          onChange={setAfter}
        />

        <label className="field">
          <span className="field__label">{t('journal.recoveryMinutes')}</span>
          <input
            className="input"
            type="number"
            min={0}
            max={600}
            value={recovery}
            onChange={(event) => setRecovery(event.target.value)}
          />
        </label>

        <button
          type="button"
          className="button button--primary button--full"
          disabled={!canSave}
          onClick={save}
        >
          {t('common.save')}
        </button>
      </section>

      <section className="stack">
        {entries === undefined ? null : entries.length === 0 ? (
          <p className="muted">{t('journal.empty')}</p>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="card journal-entry">
              <div className="journal-entry__head">
                <span className="eyebrow">{formatDateTime(entry.createdAt, i18n.language)}</span>
                {/* Two taps to delete, like the ladder: written reflection is
                    not something to lose to a mis-tap. */}
                {armedForDelete === entry.id ? (
                  <div className="confirm-delete">
                    <span className="muted">{t('common.confirmDelete')}</span>
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => {
                        setArmedForDelete(null);
                        void write((storage) => storage.deleteJournalEntry(entry.id));
                      }}
                    >
                      {t('common.delete')}
                    </button>
                    <button
                      type="button"
                      className="button button--quiet"
                      onClick={() => setArmedForDelete(null)}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button button--quiet"
                    aria-label={t('common.delete')}
                    onClick={() => setArmedForDelete(entry.id)}
                  >
                    <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                )}
              </div>

              {FIELDS.filter((field) => entry[field]).map((field) => (
                <div key={field} className="stack stack--tight">
                  <span className="eyebrow">{t(`journal.${field}`)}</span>
                  <p>{entry[field]}</p>
                </div>
              ))}

              <p className="step-count">
                {entry.intensityBefore} → {entry.intensityAfter}
                {entry.recoveryMinutes === null ? '' : ` · ${entry.recoveryMinutes}`}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
