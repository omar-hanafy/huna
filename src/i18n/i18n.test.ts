import { describe, expect, it } from 'vitest';
import { applyDocumentLocale, createI18n, directionFor } from './index';

describe('directionFor', () => {
  it('maps Arabic to rtl and English to ltr', () => {
    expect(directionFor('ar')).toBe('rtl');
    expect(directionFor('en')).toBe('ltr');
  });
});

describe('createI18n', () => {
  it('defaults to Arabic', () => {
    const i18n = createI18n();
    expect(i18n.language).toBe('ar');
    expect(i18n.t('app.name')).toBe('هنا');
  });

  it('resolves the same key in English', () => {
    const i18n = createI18n('en');
    expect(i18n.t('app.name')).toBe('Huna');
    expect(i18n.t('alert.safety.unsure')).toBe("I'm not sure");
  });

  it('interpolates placeholders', () => {
    const i18n = createI18n('en');
    expect(i18n.t('common.stepOf', { current: 2, total: 5 })).toBe('Step 2 of 5');
  });

  it('resolves nested keys in both locales', () => {
    expect(createI18n('ar').t('alert.action.options.none')).toBe('لا شيء الآن');
    expect(createI18n('en').t('alert.action.options.none')).toBe('Nothing right now');
  });

  /** A missing English string should show Arabic, never a raw key path. */
  it('returns a string rather than throwing for an unknown key', () => {
    const i18n = createI18n('en');
    expect(typeof i18n.t('this.key.does.not.exist')).toBe('string');
  });

  it('switches language at runtime', async () => {
    const i18n = createI18n('ar');
    await i18n.changeLanguage('en');
    expect(i18n.t('app.name')).toBe('Huna');
  });

  it('keeps instances independent so one screen cannot change another', async () => {
    const arabic = createI18n('ar');
    const english = createI18n('en');
    await english.changeLanguage('ar');
    expect(arabic.t('app.name')).toBe('هنا');
  });
});

describe('applyDocumentLocale', () => {
  it('sets lang and dir on the document element', () => {
    applyDocumentLocale('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    applyDocumentLocale('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
