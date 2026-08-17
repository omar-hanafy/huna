import arCrisis from './ar/crisis.json';
import arProgram from './ar/program.json';
import arSequences from './ar/sequences.json';
import arUi from './ar/ui.json';
import enCrisis from './en/crisis.json';
import enProgram from './en/program.json';
import enSequences from './en/sequences.json';
import enUi from './en/ui.json';
import {
  crisisFileSchema,
  programFileSchema,
  sequencesFileSchema,
  uiFileSchema,
  type CrisisFile,
  type ProgramFile,
  type SequencesFile,
  type UiTree,
} from './schema';

export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';

export interface LocaleContent {
  ui: UiTree;
  sequences: SequencesFile;
  program: ProgramFile;
  crisis: CrisisFile;
}

/**
 * Content is validated exhaustively by `content.guard.test.ts`, which runs in
 * CI. Re-validating on every production boot would only pay for a guarantee the
 * build already gives, so the parse runs in development only, where it turns a
 * content typo into an immediate loud failure.
 */
function verify(locale: Locale, content: LocaleContent): LocaleContent {
  if (import.meta.env.DEV) {
    uiFileSchema.parse(content.ui);
    sequencesFileSchema.parse(content.sequences);
    programFileSchema.parse(content.program);
    crisisFileSchema.parse(content.crisis);
  }
  void locale;
  return content;
}

export const CONTENT: Record<Locale, LocaleContent> = {
  ar: verify('ar', {
    ui: arUi,
    sequences: arSequences as SequencesFile,
    program: arProgram as ProgramFile,
    crisis: arCrisis as CrisisFile,
  }),
  en: verify('en', {
    ui: enUi,
    sequences: enSequences as SequencesFile,
    program: enProgram as ProgramFile,
    crisis: enCrisis as CrisisFile,
  }),
};

export function contentFor(locale: Locale): LocaleContent {
  return CONTENT[locale];
}

export * from './schema';
