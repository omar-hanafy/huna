import { useMemo, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { DEFAULT_LOCALE, type Locale } from '../content';
import { createI18n } from '../i18n';
import type { AppStorage } from '../storage/AppStorage';
import { StorageProvider } from '../storage/StorageProvider';

interface ProvidersProps {
  children: ReactNode;
  /** Injected by tests. */
  storage?: AppStorage;
  legacyBlob?: string | null;
  locale?: Locale;
}

/**
 * One i18n instance per app tree rather than the shared i18next singleton, so
 * that a test rendering two locales cannot have one bleed into the other.
 */
export function Providers({ children, storage, legacyBlob, locale = DEFAULT_LOCALE }: ProvidersProps) {
  const i18n = useMemo(() => createI18n(locale), [locale]);

  return (
    <I18nextProvider i18n={i18n}>
      <StorageProvider storage={storage} legacyBlob={legacyBlob}>
        {children}
      </StorageProvider>
    </I18nextProvider>
  );
}
