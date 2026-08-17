import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { CONTENT, DEFAULT_LOCALE, LOCALES, type Locale } from '../content';

export const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>(['ar']);

export function directionFor(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

/**
 * Arabic is the source of truth for tone, so it is both the default and the
 * fallback. A missing English key should surface the Arabic string rather than
 * a raw key path in front of the user.
 */
export function createI18n(locale: Locale = DEFAULT_LOCALE): I18nInstance {
  const instance = i18next.createInstance();

  void instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...LOCALES],
    defaultNS: 'ui',
    ns: ['ui'],
    resources: Object.fromEntries(LOCALES.map((code) => [code, { ui: CONTENT[code].ui }])),
    interpolation: {
      // React escapes for us; double-escaping mangles Arabic punctuation.
      escapeValue: false,
    },
    returnNull: false,
  });

  return instance;
}

/** Applies language and direction to the document element. */
export function applyDocumentLocale(locale: Locale, doc: Document = document): void {
  doc.documentElement.lang = locale;
  doc.documentElement.dir = directionFor(locale);
}
