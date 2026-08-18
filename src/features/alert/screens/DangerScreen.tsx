import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DangerAction } from '../../../components/DangerAction';
import { CONTENT, type Locale } from '../../../content';
import { useAlertFlow } from '../useAlertFlow';

/**
 * Safety mode, reached from "yes" and from "not sure".
 *
 * Two rules govern this screen:
 *
 *  - Nothing dials automatically. Tapping a binary question should not start a
 *    phone call for someone mid-surge; the number is offered, the choice stays
 *    theirs.
 *  - No number appears unless it was verified. A country with no verified
 *    entries shows written guidance instead, because a wrong number here is
 *    worse than no number.
 */
export function DangerScreen() {
  const { t, i18n } = useTranslation();
  // From the flow rather than from storage: this screen must render even when
  // the browser refuses storage entirely, and the flow already resolved the
  // country and the contacts, falling back to defaults if it had to.
  const { state, dispatch, preferences } = useAlertFlow();

  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';

  const countries = CONTENT[locale].crisis.countries;
  const country =
    countries.find((entry) => entry.country === preferences.country) ??
    countries.find((entry) => entry.country === 'OTHER');

  const contacts = preferences.trustedContacts;
  const unsure = state.safetyAnswer === 'unsure';

  return (
    <section className="screen screen--narrow alert-danger">
      <div className="stack stack--tight">
        <h1>{t('alert.danger.title')}</h1>
        {unsure ? <p className="lede">{t('alert.danger.cannotKnow')}</p> : null}
      </div>

      <ol className="danger-steps">
        <li>{t('alert.danger.steps.moveAway')}</li>
        <li>{t('alert.danger.steps.publicPlace')}</li>
        <li>{t('alert.danger.steps.contact')}</li>
      </ol>

      {contacts.length > 0 ? (
        <div className="stack stack--tight">
          <h2 className="eyebrow">{t('alert.danger.trustedContacts')}</h2>
          {contacts.map((contact) => (
            <DangerAction key={contact.id} href={`tel:${contact.number}`}>
              {t('alert.danger.callLabel', { label: contact.name })}
            </DangerAction>
          ))}
        </div>
      ) : (
        <p className="muted">{t('alert.danger.noContacts')}</p>
      )}

      <div className="stack stack--tight">
        <h2 className="eyebrow">{t('alert.danger.steps.resources')}</h2>
        <p className="muted">{country?.generalGuidance}</p>
        {country?.resources.map((resource) => (
          <DangerAction
            key={resource.number}
            href={`tel:${resource.number}`}
            note={t('alert.danger.verifiedOn', { date: resource.lastVerified })}
          >
            {resource.label}: <bdi>{resource.number}</bdi>
          </DangerAction>
        ))}
      </div>

      <div className="stack stack--tight">
        <Link className="button button--secondary" to="/card">
          {t('alert.danger.steps.safetyPlan')}
        </Link>
        <button
          type="button"
          className="button button--quiet"
          onClick={() => dispatch({ type: 'DANGER_RESOLVED' })}
        >
          {t('alert.danger.backToGrounding')}
        </button>
      </div>
    </section>
  );
}
