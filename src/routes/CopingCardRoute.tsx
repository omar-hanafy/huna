import { useTranslation } from 'react-i18next';
import { useCopingCard, useDebouncedWrite } from '../storage/hooks';
import type { CopingCard } from '../storage/types';
import './CopingCard.css';

type Field = Exclude<keyof CopingCard, 'id' | 'updatedAt'>;

const FIELDS: Field[] = [
  'whatHappens',
  'whatHelps',
  'whatDoesNotHelp',
  'mySentence',
  'myNextAction',
  'trustedPerson',
  'professional',
];

const PLACEHOLDER_FIELDS = new Set<Field>([
  'whatHappens',
  'whatHelps',
  'whatDoesNotHelp',
  'mySentence',
  'myNextAction',
]);

/**
 * The coping card.
 *
 * Written in a calm moment, read in a hard one. "What does not help me" is the
 * field that makes it personal: generic advice cannot know that breathing
 * exercises make things worse for this particular person, and in the moment
 * nobody wants to rediscover that.
 *
 * It prints, because a card that works when the phone is dead is worth more
 * than one that does not.
 */
export function CopingCardRoute() {
  const { t } = useTranslation();
  const card = useCopingCard();
  const { schedule } = useDebouncedWrite();

  return (
    <div className="screen screen--narrow coping-card">
      <div className="stack stack--tight">
        <h1>{t('card.title')}</h1>
        <p className="muted">{t('card.helper')}</p>
      </div>

      {FIELDS.map((field) => (
        <label key={field} className="field">
          <span className="field__label">{t(`card.${field}`)}</span>
          <textarea
            className="textarea"
            rows={2}
            defaultValue={card?.[field] ?? ''}
            placeholder={PLACEHOLDER_FIELDS.has(field) ? t(`card.placeholders.${field}`) : undefined}
            onChange={(event) => {
              const value = event.target.value;
              schedule((storage) => storage.saveCopingCard({ [field]: value }));
            }}
          />
        </label>
      ))}

      <button type="button" className="button button--secondary" onClick={() => window.print()}>
        {t('card.print')}
      </button>
    </div>
  );
}
