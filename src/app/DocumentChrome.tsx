import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDocumentChrome } from '../design-system/useDocumentChrome';
import { usePreferences } from '../storage/hooks';

/**
 * Applies stored preferences to the document from the very top of the tree.
 *
 * This used to live inside AppShell, which meant a cold start at #/alert or
 * #/onboarding ignored the saved theme, discreet mode, direction, and, worst of
 * all, the saved language: i18next always booted in Arabic, so an English user
 * reloaded into Arabic strings laid out left-to-right. Mounting this under the
 * router but above every route closes all of those gaps in one place.
 */
export function DocumentChrome() {
  const preferences = usePreferences();
  const { t, i18n } = useTranslation();

  useDocumentChrome(preferences);

  // Restore the stored language into i18next itself, not only onto <html>.
  useEffect(() => {
    if (preferences && i18n.language !== preferences.locale) {
      void i18n.changeLanguage(preferences.locale);
    }
  }, [preferences, i18n]);

  // Title and description follow the active language.
  useEffect(() => {
    document.title = t('app.name');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', `${t('app.name')} - ${t('app.tagline')}`);
  }, [t, i18n.language]);

  return null;
}
