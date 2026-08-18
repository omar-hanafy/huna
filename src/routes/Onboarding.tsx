import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { prefersReducedMotion } from '../design-system/useDocumentChrome';
import { createId } from '../lib/id';
import { usePreferences, useWrite } from '../storage/hooks';
import type { TrustedContact, UserPreferences } from '../storage/types';
import './Onboarding.css';

type Step = 'welcome' | 'breathing' | 'contacts' | 'country' | 'metrics' | 'boundary';

const ORDER: Step[] = ['welcome', 'breathing', 'contacts', 'country', 'metrics', 'boundary'];

/**
 * First run.
 *
 * Only asks what makes the sequences safe for this particular person. The
 * breathing question is the load-bearing one: answering "it makes things worse"
 * removes every breath step from the whole app rather than merely
 * deprioritising them, because breath focus reliably increases distress for a
 * significant share of this population.
 *
 * Everything here is skippable. Someone who opens this app for the first time
 * mid-episode should be able to reach the alert flow immediately.
 */
export function Onboarding() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const write = useWrite();
  const preferences = usePreferences();

  const [step, setStep] = useState<Step>('welcome');
  const [breathing, setBreathing] = useState<UserPreferences['breathing']>('unsure');
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftNumber, setDraftNumber] = useState('');
  const [country, setCountry] = useState('EG');
  const [showMetrics, setShowMetrics] = useState(true);

  const index = ORDER.indexOf(step);

  const finish = async () => {
    await write((storage) =>
      storage.savePreferences({
        breathing,
        trustedContacts: contacts,
        country,
        showMetrics,
        reducedMotion: prefersReducedMotion(),
        onboardingCompletedAt: new Date().toISOString(),
        // Kept if it already exists: someone who reopens this screen has been
        // on the program for weeks, and restarting the clock would silently
        // move them back to week one.
        programStartedAt: preferences?.programStartedAt ?? new Date().toISOString(),
      }),
    );
    void navigate('/', { replace: true });
  };

  const chooseLanguage = (locale: UserPreferences['locale']) => {
    void i18n.changeLanguage(locale);
    void write((storage) => storage.savePreferences({ locale }));
  };

  /**
   * Onboarding runs once.
   *
   * Reaching #/onboarding again after finishing it - a stale tab, a bookmark,
   * the back button - used to be one tap from wiping the trusted contacts,
   * country, and breathing answer, because finishing writes fresh defaults over
   * everything. There is nothing here to re-do, so there is nothing to show.
   */
  if (preferences?.onboardingCompletedAt) return <Navigate to="/" replace />;

  const addContact = () => {
    if (!draftName.trim() || !draftNumber.trim()) return;
    setContacts((current) => [
      ...current,
      { id: createId(), name: draftName.trim(), number: draftNumber.trim() },
    ]);
    setDraftName('');
    setDraftNumber('');
  };

  return (
    <div className="screen screen--narrow onboarding">
      <div className="stack stack--tight">
        <span className="step-count">{t('common.stepOf', { current: index + 1, total: ORDER.length })}</span>
        <div className="progress-line" aria-hidden="true">
          <span style={{ inlineSize: `${((index + 1) / ORDER.length) * 100}%` }} />
        </div>
      </div>

      {step === 'welcome' ? (
        <section className="stack">
          <h1>{t('onboarding.welcome.title')}</h1>
          <p className="lede">{t('onboarding.welcome.body')}</p>
          {/* Offered first, in both languages at once: someone who does not
              read Arabic should not have to finish an Arabic setup to find the
              switch in settings. */}
          <div className="onboarding__language">
            <button
              type="button"
              className="button button--quiet"
              aria-pressed={i18n.language !== 'en'}
              onClick={() => chooseLanguage('ar')}
            >
              العربية
            </button>
            <button
              type="button"
              className="button button--quiet"
              aria-pressed={i18n.language === 'en'}
              onClick={() => chooseLanguage('en')}
            >
              English
            </button>
          </div>
          <button
            type="button"
            className="button button--primary button--full"
            onClick={() => setStep('breathing')}
          >
            {t('common.next')}
          </button>
        </section>
      ) : null}

      {step === 'breathing' ? (
        <section className="stack">
          <h1>{t('onboarding.breathing.question')}</h1>
          <div className="stack">
            {(['helps', 'worsens', 'unsure'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="choice"
                aria-pressed={breathing === option}
                onClick={() => setBreathing(option)}
              >
                <span className="choice__title">{t(`onboarding.breathing.${option}`)}</span>
              </button>
            ))}
          </div>
          <p className="muted">{t('onboarding.breathing.note')}</p>
          <button
            type="button"
            className="button button--primary button--full"
            onClick={() => setStep('contacts')}
          >
            {t('common.next')}
          </button>
        </section>
      ) : null}

      {step === 'contacts' ? (
        <section className="stack">
          <h1>{t('onboarding.contacts.title')}</h1>
          <p className="muted">{t('onboarding.contacts.helper')}</p>

          <ul className="contact-list">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <span>
                  {/* Isolated: a number beside Arabic text reorders its groups. */}
                  {contact.name} <bdi className="muted">{contact.number}</bdi>
                </span>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => setContacts((current) => current.filter((item) => item.id !== contact.id))}
                >
                  {t('common.delete')}
                </button>
              </li>
            ))}
          </ul>

          <div className="field">
            <label htmlFor="contact-name">{t('onboarding.contacts.namePlaceholder')}</label>
            <input
              id="contact-name"
              className="input"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-number">{t('onboarding.contacts.numberPlaceholder')}</label>
            <input
              id="contact-number"
              className="input"
              type="tel"
              inputMode="tel"
              value={draftNumber}
              onChange={(event) => setDraftNumber(event.target.value)}
            />
          </div>
          <button type="button" className="button button--secondary" onClick={addContact}>
            {t('common.add')}
          </button>

          <button
            type="button"
            className="button button--primary button--full"
            onClick={() => setStep('country')}
          >
            {t('common.next')}
          </button>
        </section>
      ) : null}

      {step === 'country' ? (
        <section className="stack">
          <h1>{t('onboarding.country.question')}</h1>
          <p className="muted">{t('onboarding.country.helper')}</p>
          <div className="field">
            <label htmlFor="country">{t('onboarding.country.question')}</label>
            <select
              id="country"
              className="select"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="EG">مصر / Egypt</option>
              <option value="OTHER">{t('onboarding.country.other')}</option>
            </select>
          </div>
          <button
            type="button"
            className="button button--primary button--full"
            onClick={() => setStep('metrics')}
          >
            {t('common.next')}
          </button>
        </section>
      ) : null}

      {step === 'metrics' ? (
        <section className="stack">
          <h1>{t('onboarding.metrics.question')}</h1>
          <div className="stack">
            <button
              type="button"
              className="choice"
              aria-pressed={showMetrics}
              onClick={() => setShowMetrics(true)}
            >
              <span className="choice__title">{t('onboarding.metrics.show')}</span>
            </button>
            <button
              type="button"
              className="choice"
              aria-pressed={!showMetrics}
              onClick={() => setShowMetrics(false)}
            >
              <span className="choice__title">{t('onboarding.metrics.hide')}</span>
            </button>
          </div>
          <p className="muted">{t('onboarding.metrics.note')}</p>
          <button
            type="button"
            className="button button--primary button--full"
            onClick={() => setStep('boundary')}
          >
            {t('common.next')}
          </button>
        </section>
      ) : null}

      {step === 'boundary' ? (
        <section className="stack">
          <h1>{t('onboarding.boundary.title')}</h1>
          <p className="lede">{t('onboarding.boundary.body')}</p>
          <button type="button" className="button button--primary button--full" onClick={() => void finish()}>
            {t('onboarding.boundary.acknowledge')}
          </button>
        </section>
      ) : null}

      {/* Someone opening this for the first time mid-episode must not be held here. */}
      <button type="button" className="button button--quiet" onClick={() => void finish()}>
        {t('common.skip')}
      </button>
    </div>
  );
}
