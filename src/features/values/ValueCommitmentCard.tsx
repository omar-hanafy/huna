import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createId } from '../../lib/id';
import { useLive, usePreferences, useWrite } from '../../storage/hooks';
import type { ValueCommitment } from '../../storage/types';

const SUGGESTED = [
  'health',
  'learning',
  'relationship',
  'work',
  'independence',
  'creativity',
  'faith',
] as const;

/**
 * Week four: one small action a day in service of something you care about.
 *
 * The framing is deliberate. The prompt is not "do this once you feel calm", it
 * is "do this while the tension is still here". Waiting for zero anxiety before
 * living is the pattern the whole program is trying to interrupt.
 */
export function ValueCommitmentCard({ date }: { date: string }) {
  const { t } = useTranslation();
  const preferences = usePreferences();
  const write = useWrite();
  const commitments = useLive((storage) => storage.getValueCommitments({ from: date, to: date }), [date]);

  const today = commitments?.[0] ?? null;
  const [value, setValue] = useState('');
  const [action, setAction] = useState('');

  const chosen = preferences?.values ?? [];
  const options = chosen.length > 0 ? chosen : SUGGESTED.map((key) => t(`values.suggested.${key}`));

  const save = () => {
    if (!value || !action.trim()) return;
    const commitment: ValueCommitment = {
      id: today?.id ?? createId(),
      date,
      value,
      action: action.trim(),
      completed: today?.completed ?? false,
    };
    void write((storage) => storage.saveValueCommitment(commitment));
    setAction('');
  };

  if (today) {
    return (
      <section className="card card--warm stack">
        <span className="eyebrow">{t('values.title')}</span>
        <p className="choice__title">{today.action}</p>
        <p className="muted">{today.value}</p>
        <button
          type="button"
          className="button button--secondary"
          aria-pressed={today.completed}
          onClick={() =>
            void write((storage) => storage.saveValueCommitment({ ...today, completed: !today.completed }))
          }
        >
          {today.completed ? t('values.done') : t('values.markDone')}
        </button>
      </section>
    );
  }

  return (
    <section className="card card--warm stack">
      <div className="stack stack--tight">
        <span className="eyebrow">{t('values.title')}</span>
        <p className="muted">{t('values.helper')}</p>
      </div>

      <label className="field">
        <span className="field__label">{t('values.pickValue')}</span>
        <select className="select" value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="">{t('common.optional')}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">{t('values.action')}</span>
        <input
          className="input"
          value={action}
          placeholder={t('values.actionPlaceholder')}
          onChange={(event) => setAction(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="button button--secondary"
        disabled={!value || !action.trim()}
        onClick={save}
      >
        {t('common.save')}
      </button>
    </section>
  );
}
