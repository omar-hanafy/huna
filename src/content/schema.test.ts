import { describe, expect, it } from 'vitest';
import {
  crisisFileSchema,
  programWeekSchema,
  sequenceStepSchema,
  sequencesFileSchema,
  uiFileSchema,
} from './schema';

const orientStep = { id: 'a', kind: 'orient', seconds: 20, text: 'انظر حولك مرة واحدة' };
const senseStep = { id: 'b', kind: 'sense', seconds: 20, text: 'سمِّ ثلاثة أشياء' };
const bodyStep = { id: 'c', kind: 'body', seconds: 20, text: 'قدماك على الأرض' };

function sequence(id: string, steps: unknown[] = [orientStep, senseStep, bodyStep]) {
  return { id, title: 'عنوان', subtitle: 'وصف قصير', steps };
}

function allSequences(overrides: Record<string, unknown[]> = {}) {
  const ids = ['scanning', 'startled', 'activated', 'detached', 'predicting', 'sleepless', 'unsure'];
  return {
    version: 1,
    sequences: ids.map((id) => sequence(id, overrides[id])),
  };
}

describe('sequenceStepSchema', () => {
  it('accepts a non-breath step with no substitute', () => {
    expect(sequenceStepSchema.safeParse(orientStep).success).toBe(true);
  });

  it('rejects a breath step that declares no substitute', () => {
    const result = sequenceStepSchema.safeParse({
      id: 'x',
      kind: 'breath',
      seconds: 30,
      text: 'زفير أطول',
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('substitute');
  });

  it('accepts a breath step whose substitute is a non-breath step', () => {
    const result = sequenceStepSchema.safeParse({
      id: 'x',
      kind: 'breath',
      seconds: 30,
      text: 'زفير أطول',
      substitute: { id: 'x-alt', kind: 'body', seconds: 30, text: 'أرخِ الفك والكتفين' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a substitute that is itself a breath step', () => {
    const result = sequenceStepSchema.safeParse({
      id: 'x',
      kind: 'breath',
      seconds: 30,
      text: 'زفير أطول',
      substitute: { id: 'x-alt', kind: 'breath', seconds: 30, text: 'شهيق' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive duration', () => {
    expect(sequenceStepSchema.safeParse({ ...orientStep, seconds: 0 }).success).toBe(false);
  });
});

describe('sequencesFileSchema', () => {
  it('accepts a file covering every state', () => {
    expect(sequencesFileSchema.safeParse(allSequences()).success).toBe(true);
  });

  it('rejects a file missing a state', () => {
    const file = allSequences();
    file.sequences = file.sequences.filter((s) => s.id !== 'sleepless');
    expect(sequencesFileSchema.safeParse(file).success).toBe(false);
  });

  it('rejects duplicate sequence ids', () => {
    const file = allSequences();
    file.sequences.push(sequence('unsure'));
    expect(sequencesFileSchema.safeParse(file).success).toBe(false);
  });

  it('rejects a sequence with fewer than three steps', () => {
    expect(sequencesFileSchema.safeParse(allSequences({ unsure: [orientStep] })).success).toBe(false);
  });

  /**
   * Spec §6.3: breath focus and body scanning commonly worsen depersonalisation,
   * so this is a content-level guarantee rather than a runtime preference.
   */
  it('rejects a breath step inside the dissociation sequence', () => {
    const breath = {
      id: 'd',
      kind: 'breath',
      seconds: 30,
      text: 'زفير',
      substitute: { id: 'd-alt', kind: 'body', seconds: 30, text: 'أرخِ الفك' },
    };
    const file = allSequences({ detached: [orientStep, senseStep, bodyStep, breath] });
    const result = sequencesFileSchema.safeParse(file);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('depersonalisation');
  });
});

describe('programWeekSchema', () => {
  const week = {
    number: 1,
    eyebrow: 'الأسبوع الأول',
    title: 'عنوان',
    description: 'وصف',
    focusTask: 'مهمة',
    outcome: 'نتيجة',
    accent: 'sage',
    daily: ['خطوة'],
    avoid: ['تحذير'],
  };

  it('accepts a well-formed week', () => {
    expect(programWeekSchema.safeParse(week).success).toBe(true);
  });

  it('rejects a week number outside 1 to 4', () => {
    expect(programWeekSchema.safeParse({ ...week, number: 5 }).success).toBe(false);
  });

  it('rejects an accent outside the palette', () => {
    expect(programWeekSchema.safeParse({ ...week, accent: 'red' }).success).toBe(false);
  });
});

describe('crisisFileSchema', () => {
  const resource = {
    label: 'خط المساعدة',
    number: '0800',
    source: 'https://example.org/verified',
    lastVerified: '2026-08-17',
  };
  const other = {
    country: 'OTHER',
    label: 'أخرى',
    generalGuidance: 'تواصل مع خدمات الطوارئ المحلية أو شخص تثق به.',
    resources: [],
  };

  it('accepts a file containing the generic fallback block', () => {
    const file = { version: 1, countries: [other] };
    expect(crisisFileSchema.safeParse(file).success).toBe(true);
  });

  /**
   * Spec §14: an unverified country must fall back to generic guidance rather
   * than display a possibly-wrong number.
   */
  it('rejects a file with no generic fallback block', () => {
    const file = {
      version: 1,
      countries: [{ country: 'EG', label: 'مصر', generalGuidance: 'إرشاد', resources: [resource] }],
    };
    expect(crisisFileSchema.safeParse(file).success).toBe(false);
  });

  it('rejects a resource with no source url', () => {
    const file = {
      version: 1,
      countries: [
        other,
        {
          country: 'EG',
          label: 'مصر',
          generalGuidance: 'إرشاد',
          resources: [{ ...resource, source: 'not-a-url' }],
        },
      ],
    };
    expect(crisisFileSchema.safeParse(file).success).toBe(false);
  });

  it('rejects a resource with a malformed verification date', () => {
    const file = {
      version: 1,
      countries: [
        other,
        {
          country: 'EG',
          label: 'مصر',
          generalGuidance: 'إرشاد',
          resources: [{ ...resource, lastVerified: '17-08-2026' }],
        },
      ],
    };
    expect(crisisFileSchema.safeParse(file).success).toBe(false);
  });
});

describe('uiFileSchema', () => {
  it('accepts arbitrarily nested string maps', () => {
    expect(uiFileSchema.safeParse({ a: 'x', b: { c: 'y', d: { e: 'z' } } }).success).toBe(true);
  });

  it('rejects a non-string leaf', () => {
    expect(uiFileSchema.safeParse({ a: 42 }).success).toBe(false);
  });
});
