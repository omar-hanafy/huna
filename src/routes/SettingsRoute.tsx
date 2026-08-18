import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DestructiveAction } from '../components/DangerAction';
import { backupFilename, downloadJson } from '../lib/download';
import { createId } from '../lib/id';
import { usePreferences, useWrite } from '../storage/hooks';
import { useStorage } from '../storage/useStorage';
import {
  LOCKOUT_OPTIONS,
  StorageQuotaError,
  StorageUnavailableError,
  type UserPreferences,
} from '../storage/types';

/**
 * Settings, data, and the boundary statement.
 *
 * Export and permanent delete are both here and both one tap away. Erasing is
 * styled as an ordinary destructive control rather than an emergency, because
 * red in this app means a danger the user reported, not a button they might
 * regret.
 */
export function SettingsRoute() {
  const { t, i18n } = useTranslation();
  const preferences = usePreferences();
  const storage = useStorage();
  const write = useWrite();

  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftNumber, setDraftNumber] = useState('');

  /**
   * Controls read from IndexedDB through a liveQuery, so a toggle would sit
   * visibly still until the write round-tripped. This overlays the change
   * immediately and drops each key once the stored value agrees with it, so the
   * store stays the source of truth without the control feeling broken.
   */
  const [pending, setPending] = useState<Partial<Omit<UserPreferences, 'id'>>>({});

  const update = (patch: Partial<Omit<UserPreferences, 'id'>>, onFailure?: () => void) => {
    setPending((current) => ({ ...current, ...patch }));
    void write((instance) => instance.savePreferences(patch)).then((ok) => {
      // A failed write must not leave the control showing a value that was
      // never stored: drop the overlay and let the store speak again.
      if (ok) return;
      setPending((current) => {
        const next = { ...current };
        for (const key of Object.keys(patch)) delete next[key as keyof typeof next];
        return next;
      });
      onFailure?.();
    });
  };

  const exportData = async () => {
    const ok = await write(async (instance) => {
      const bundle = await instance.exportAll();
      downloadJson(backupFilename(), bundle);
    });
    if (!ok) setMessage(t('settings.actionFailed'));
  };

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const result = await storage.importAll(parsed);
      // Imported preferences must not sit behind a stale optimistic overlay.
      if (result.ok) setPending({});
      setMessage(result.ok ? t('settings.importSuccess') : t('settings.importFailure'));
    } catch (error) {
      // A browser that refused the write did not hand back a bad file, and
      // saying so would send the user hunting through a backup that is fine.
      if (error instanceof StorageQuotaError) setMessage(t('settings.storageFull'));
      else if (error instanceof StorageUnavailableError) setMessage(t('settings.storageUnavailable'));
      else setMessage(t('settings.importFailure'));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    const ok = await write(async (instance) => {
      await instance.deleteAll();
      await instance.initialise();
    });
    setConfirmReset(false);
    setPending({});
    setMessage(ok ? t('settings.resetDone') : t('settings.actionFailed'));
  };

  if (!preferences) return <div className="screen" aria-busy="true" />;

  // Entries the store has caught up with stop overriding, so a change made in
  // another tab still shows through rather than being masked forever. Arrays
  // and objects are compared by value: a fresh array of the same contacts is
  // the store agreeing, not a change still in flight.
  const settled = (key: string, value: unknown): boolean => {
    const stored = preferences[key as keyof UserPreferences];
    if (value !== null && typeof value === 'object') return JSON.stringify(stored) === JSON.stringify(value);
    return stored === value;
  };
  const unsettled = Object.fromEntries(
    Object.entries(pending).filter(([key, value]) => !settled(key, value)),
  );
  const shown: UserPreferences = { ...preferences, ...unsettled };

  const addContact = () => {
    if (!draftName.trim() || !draftNumber.trim()) return;
    update({
      trustedContacts: [
        ...shown.trustedContacts,
        { id: createId(), name: draftName.trim(), number: draftNumber.trim() },
      ],
    });
    setDraftName('');
    setDraftNumber('');
  };

  const removeContact = (id: string) => {
    update({ trustedContacts: shown.trustedContacts.filter((contact) => contact.id !== id) });
  };

  return (
    <div className="screen settings">
      <h1>{t('settings.title')}</h1>

      <section className="card stack">
        <h2>{t('settings.experience')}</h2>

        <label className="field">
          <span className="field__label">{t('settings.language')}</span>
          <select
            className="select"
            value={shown.locale}
            onChange={(event) => {
              const locale = event.target.value as UserPreferences['locale'];
              const previous = shown.locale;
              // The interface switches at once, and switches back if the write
              // is refused: a half-applied language, English text laid out
              // right to left, is worse than either language.
              update({ locale }, () => void i18n.changeLanguage(previous));
              void i18n.changeLanguage(locale);
            }}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t('settings.theme')}</span>
          <select
            className="select"
            value={shown.theme}
            onChange={(event) => update({ theme: event.target.value as UserPreferences['theme'] })}
          >
            <option value="system">{t('settings.themeSystem')}</option>
            <option value="light">{t('settings.themeLight')}</option>
            <option value="dark">{t('settings.themeDark')}</option>
          </select>
        </label>

        <label className="setting-row">
          <input
            type="checkbox"
            checked={shown.reducedMotion}
            onChange={(event) => update({ reducedMotion: event.target.checked })}
          />
          <span>{t('settings.reducedMotion')}</span>
        </label>

        <label className="setting-row">
          <input
            type="checkbox"
            checked={shown.discreetMode}
            onChange={(event) => update({ discreetMode: event.target.checked })}
          />
          <span>{t('settings.discreetMode')}</span>
        </label>

        <label className="setting-row">
          <input
            type="checkbox"
            checked={shown.showMetrics}
            onChange={(event) => update({ showMetrics: event.target.checked })}
          />
          <span>{t('settings.showMetrics')}</span>
        </label>

        {/* Deliberately not in the tab bar: numbers on the way to everything
            else invite the monitoring this app is trying to reduce. */}
        <Link className="button button--quiet" to="/progress">
          {t('nav.progress')}
        </Link>

        <label className="setting-row">
          <input
            type="checkbox"
            checked={shown.breathing !== 'worsens'}
            onChange={(event) => update({ breathing: event.target.checked ? 'unsure' : 'worsens' })}
          />
          <span>{t('settings.breathingEnabled')}</span>
        </label>
      </section>

      <section className="card stack">
        <h2>{t('settings.safety')}</h2>
        <label className="field">
          <span className="field__label">{t('settings.lockoutWindow')}</span>
          <select
            className="select"
            value={shown.lockoutMinutes}
            onChange={(event) =>
              update({ lockoutMinutes: Number(event.target.value) as UserPreferences['lockoutMinutes'] })
            }
          >
            {LOCKOUT_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? t('settings.lockoutOff') : t('settings.lockoutMinutes', { count: minutes })}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">{t('settings.lockoutExplain')}</p>
      </section>

      {/*
        Editable here, not only during onboarding. A number changes, a person
        moves out of someone's life, and the danger screen must not keep
        offering a contact that is no longer the right one.
      */}
      <section className="card stack">
        <h2>{t('onboarding.contacts.title')}</h2>
        <p className="muted">{t('onboarding.contacts.helper')}</p>

        <ul className="contact-list">
          {shown.trustedContacts.map((contact) => (
            <li key={contact.id}>
              <span>
                {/* A phone number beside Arabic text reorders its groups
                    without isolation: 0100 123 4567 reads back as 4567 123
                    0100, which is the wrong number. */}
                {contact.name} <bdi className="muted">{contact.number}</bdi>
              </span>
              <button
                type="button"
                className="button button--quiet"
                aria-label={t('common.delete')}
                onClick={() => removeContact(contact.id)}
              >
                <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <div className="field">
          <label htmlFor="settings-contact-name">{t('onboarding.contacts.namePlaceholder')}</label>
          <input
            id="settings-contact-name"
            className="input"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="settings-contact-number">{t('onboarding.contacts.numberPlaceholder')}</label>
          <input
            id="settings-contact-number"
            className="input"
            type="tel"
            inputMode="tel"
            value={draftNumber}
            onChange={(event) => setDraftNumber(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="button button--secondary"
          disabled={!draftName.trim() || !draftNumber.trim()}
          onClick={addContact}
        >
          {t('common.add')}
        </button>
      </section>

      <section className="card stack">
        <h2>{t('settings.data')}</h2>
        <p className="muted">{t('app.privacyNote')}</p>

        <button type="button" className="button button--secondary" onClick={() => void exportData()}>
          {t('settings.export')}
        </button>

        {/* Kept out of the tab order: the visible button opens it, and a
            focusable control with no announced label is worse than none. */}
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importData(file);
          }}
        />
        <button type="button" className="button button--secondary" onClick={() => fileInput.current?.click()}>
          {t('settings.import')}
        </button>

        <DestructiveAction onClick={() => void reset()}>
          {confirmReset ? t('settings.resetConfirm') : t('settings.reset')}
        </DestructiveAction>
        {confirmReset ? (
          <button type="button" className="button button--quiet" onClick={() => setConfirmReset(false)}>
            {t('common.cancel')}
          </button>
        ) : null}

        {/* Announced, because the outcome of an import or an erase is exactly
            the kind of thing a screen-reader user must not have to go hunting
            for. */}
        <p className={message ? 'banner' : 'sr-only'} role="status" aria-live="polite">
          {message}
        </p>
      </section>

      <section className="card card--warm stack">
        <h2>{t('boundary.title')}</h2>
        <p>{t('boundary.body')}</p>
        <p>{t('boundary.crisis')}</p>
      </section>
    </div>
  );
}
