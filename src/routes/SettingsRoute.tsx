import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DestructiveAction } from '../components/DangerAction';
import { backupFilename, downloadJson } from '../lib/download';
import { usePreferences, useWrite } from '../storage/hooks';
import { useStorage } from '../storage/useStorage';
import { LOCKOUT_OPTIONS, type UserPreferences } from '../storage/types';

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

  /**
   * Controls read from IndexedDB through a liveQuery, so a toggle would sit
   * visibly still until the write round-tripped. This overlays the change
   * immediately and drops each key once the stored value agrees with it, so the
   * store stays the source of truth without the control feeling broken.
   */
  const [pending, setPending] = useState<Partial<Omit<UserPreferences, 'id'>>>({});

  const update = (patch: Partial<Omit<UserPreferences, 'id'>>) => {
    setPending((current) => ({ ...current, ...patch }));
    void write((instance) => instance.savePreferences(patch));
  };

  const exportData = async () => {
    const bundle = await storage.exportAll();
    downloadJson(backupFilename(), bundle);
  };

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const result = await storage.importAll(parsed);
      setMessage(result.ok ? t('settings.importSuccess') : t('settings.importFailure'));
    } catch {
      setMessage(t('settings.importFailure'));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await storage.deleteAll();
    await storage.initialise();
    setConfirmReset(false);
    setMessage(t('settings.resetDone'));
  };

  if (!preferences) return <div className="screen" aria-busy="true" />;

  // Entries the store has caught up with stop overriding, so a change made in
  // another tab still shows through rather than being masked forever.
  const unsettled = Object.fromEntries(
    Object.entries(pending).filter(([key, value]) => preferences[key as keyof UserPreferences] !== value),
  );
  const shown: UserPreferences = { ...preferences, ...unsettled };

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
              update({ locale });
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
                {minutes === 0 ? t('settings.lockoutOff') : t('settings.lockoutMinutes', { minutes })}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">{t('settings.lockoutExplain')}</p>
      </section>

      <section className="card stack">
        <h2>{t('settings.data')}</h2>
        <p className="muted">{t('app.privacyNote')}</p>

        <button type="button" className="button button--secondary" onClick={() => void exportData()}>
          {t('settings.export')}
        </button>

        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          accept="application/json,.json"
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

        {message ? <p className="banner">{message}</p> : null}
      </section>

      <section className="card card--warm stack">
        <h2>{t('boundary.title')}</h2>
        <p>{t('boundary.body')}</p>
        <p>{t('boundary.crisis')}</p>
      </section>
    </div>
  );
}
