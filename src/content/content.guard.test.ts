import { describe, expect, it } from 'vitest';
import { CONTENT, LOCALES, type Locale } from './index';
import { crisisFileSchema, programFileSchema, sequencesFileSchema, uiFileSchema } from './schema';

function flattenKeys(tree: unknown, prefix = ''): string[] {
  if (typeof tree !== 'object' || tree === null) return [prefix];
  return Object.entries(tree as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Plural variants are not a key each.
 *
 * Arabic distinguishes six plural categories and English two, so a sentence
 * with a count legitimately exists as `key_few` in one locale and not the
 * other. Parity is about the sentence, which is the base key.
 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function baseKey(key: string): string {
  return key.replace(PLURAL_SUFFIX, '');
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(allStrings);
  return [];
}

function everyStringIn(locale: Locale): string[] {
  const content = CONTENT[locale];
  return [
    ...allStrings(content.ui),
    ...allStrings(content.sequences),
    ...allStrings(content.program),
    ...allStrings(content.crisis),
  ];
}

describe.each(LOCALES)('content for locale "%s"', (locale) => {
  const content = CONTENT[locale];

  it('parses against every schema', () => {
    expect(uiFileSchema.safeParse(content.ui).success).toBe(true);
    expect(sequencesFileSchema.safeParse(content.sequences).success).toBe(true);
    expect(programFileSchema.safeParse(content.program).success).toBe(true);
    expect(crisisFileSchema.safeParse(content.crisis).success).toBe(true);
  });

  /**
   * Spec principle §2.1: the app never asserts that the user is safe, because it
   * cannot see their environment. A reassuring phrase written casually into copy
   * would quietly break that promise, so it is checked rather than trusted.
   */
  it('never asserts that the user is safe', () => {
    const forbidden = [
      /أنت\s+آمن/,
      /أنت\s+في\s+أمان/,
      /المكان\s+آمن/,
      /لا\s+يوجد\s+خطر\b(?!\s+مباشر)/,
      /you\s+are\s+safe/i,
      /you're\s+safe/i,
      /it\s+is\s+safe/i,
      /there\s+is\s+no\s+danger/i,
      /nothing\s+bad\s+will\s+happen/i,
    ];

    /**
     * "This app cannot determine whether you are safe" contains the forbidden
     * phrase but is precisely the copy the principle demands, so clauses that
     * disclaim knowledge are exempt. The check runs per sentence rather than
     * per string so a disclaimer cannot launder an assertion elsewhere in the
     * same paragraph.
     */
    const disclaimsKnowledge = [
      /cannot/i,
      /can't/i,
      /does\s+not\s+know/i,
      /doesn't\s+know/i,
      /unable\s+to/i,
      /لا\s+يستطيع/,
      /لا\s+يعرف/,
      /لا\s+نعرف/,
      /لا\s+يمكن/,
    ];

    const offenders: string[] = [];
    for (const text of everyStringIn(locale)) {
      for (const sentence of text.split(/[.!?؟\n]/)) {
        if (disclaimsKnowledge.some((pattern) => pattern.test(sentence))) continue;
        if (forbidden.some((pattern) => pattern.test(sentence))) offenders.push(sentence.trim());
      }
    }
    expect(offenders, `These clauses assert safety:\n${offenders.join('\n')}`).toEqual([]);
  });

  /**
   * Spec §11: an insight naming a physiological state at a timestamp invites
   * body monitoring and offers nothing actionable.
   */
  it('has no insight template pairing a body state with a clock time', () => {
    const offenders = allStrings(content.ui).filter(
      (text) => /\{\{time\}\}/.test(text) && /عصبي|nervous system|جهازك|stress level/i.test(text),
    );
    expect(offenders).toEqual([]);
  });

  it('contains a generic fallback for countries with no verified numbers', () => {
    const other = content.crisis.countries.find((country) => country.country === 'OTHER');
    expect(other).toBeDefined();
    expect(other?.resources).toEqual([]);
    expect(other?.generalGuidance.length).toBeGreaterThan(40);
  });

  /**
   * Spec §14: staleness must be loud. A number nobody has re-checked in a year
   * is a number that might send someone to a disconnected line.
   */
  it('has no crisis resource verified more than 365 days ago', () => {
    const now = new Date('2026-08-17T00:00:00Z');
    const stale: string[] = [];
    for (const country of content.crisis.countries) {
      for (const resource of country.resources) {
        const ageDays = (now.getTime() - new Date(resource.lastVerified).getTime()) / 86_400_000;
        if (ageDays > 365) stale.push(`${country.country}/${resource.label} (${resource.lastVerified})`);
      }
    }
    expect(stale, `Re-verify these crisis numbers:\n${stale.join('\n')}`).toEqual([]);
  });

  it('gives every crisis resource a source url', () => {
    for (const country of content.crisis.countries) {
      for (const resource of country.resources) {
        expect(resource.source, `${country.country}/${resource.label}`).toMatch(/^https:\/\//);
      }
    }
  });

  it('gives every breath step a non-breath substitute', () => {
    for (const sequence of content.sequences.sequences) {
      for (const step of sequence.steps) {
        if (step.kind !== 'breath') continue;
        expect(step.substitute, `${sequence.id}/${step.id}`).toBeDefined();
        expect(step.substitute?.kind).not.toBe('breath');
      }
    }
  });
});

describe('locale parity', () => {
  it('has identical ui key sets across locales', () => {
    const [first, ...rest] = LOCALES;
    const reference = uniqueSorted(flattenKeys(CONTENT[first].ui).map(baseKey));
    for (const locale of rest) {
      const other = uniqueSorted(flattenKeys(CONTENT[locale].ui).map(baseKey));
      const missing = reference.filter((key) => !other.includes(key));
      const extra = other.filter((key) => !reference.includes(key));
      expect(missing, `Missing in ${locale}:\n${missing.join('\n')}`).toEqual([]);
      expect(extra, `Extra in ${locale}:\n${extra.join('\n')}`).toEqual([]);
    }
  });

  /**
   * Comparing base keys is what lets Arabic carry six forms where English
   * carries two, but it also means a missing form is invisible to the check
   * above. i18next renders the raw key when a category has no string, so every
   * category the language actually uses has to be present.
   */
  it('gives every counted string all the plural forms its language needs', () => {
    const required: Record<Locale, string[]> = {
      ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
      en: ['one', 'other'],
    };

    for (const locale of LOCALES) {
      const forms = new Map<string, Set<string>>();
      for (const key of flattenKeys(CONTENT[locale].ui)) {
        const match = PLURAL_SUFFIX.exec(key);
        if (!match) continue;
        const base = baseKey(key);
        forms.set(base, (forms.get(base) ?? new Set()).add(match[1]!));
      }

      const missing: string[] = [];
      for (const [base, present] of forms) {
        for (const category of required[locale]) {
          if (!present.has(category)) missing.push(`${base}_${category}`);
        }
      }
      expect(missing, `Missing plural forms in ${locale}:\n${missing.join('\n')}`).toEqual([]);
    }
  });

  it('has the same sequence ids and step ids across locales', () => {
    const [first, ...rest] = LOCALES;
    const signature = (locale: Locale) =>
      CONTENT[locale].sequences.sequences.map((s) => `${s.id}:${s.steps.map((step) => step.id).join(',')}`);
    for (const locale of rest) {
      expect(signature(locale)).toEqual(signature(first));
    }
  });

  it('has the same crisis numbers across locales, since a number is not translatable', () => {
    const [first, ...rest] = LOCALES;
    const numbers = (locale: Locale) =>
      CONTENT[locale].crisis.countries.flatMap((c) => c.resources.map((r) => `${c.country}:${r.number}`));
    for (const locale of rest) {
      expect(numbers(locale)).toEqual(numbers(first));
    }
  });

  it('uses the same interpolation placeholders in every locale', () => {
    const [first, ...rest] = LOCALES;
    // Compared per base key as a union across plural variants: "a minute ago"
    // drops the count that "{{count}} minutes ago" carries, in both languages.
    const placeholders = (locale: Locale) => {
      const map = new Map<string, string[]>();
      const walk = (node: unknown, path: string) => {
        if (typeof node === 'string') {
          const key = baseKey(path);
          const found = [...node.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!);
          map.set(key, uniqueSorted([...(map.get(key) ?? []), ...found]));
          return;
        }
        if (typeof node === 'object' && node !== null) {
          for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key);
        }
      };
      walk(CONTENT[locale].ui, '');
      return map;
    };

    const reference = placeholders(first);
    for (const locale of rest) {
      const other = placeholders(locale);
      const mismatches: string[] = [];
      for (const [path, tokens] of reference) {
        const otherTokens = other.get(path) ?? [];
        if (JSON.stringify(tokens) !== JSON.stringify(otherTokens)) {
          mismatches.push(`${path}: ${first}=[${tokens.join()}] ${locale}=[${otherTokens.join()}]`);
        }
      }
      expect(mismatches, `Placeholder mismatch:\n${mismatches.join('\n')}`).toEqual([]);
    }
  });
});
