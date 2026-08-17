import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'src');

/**
 * Where the danger colour is allowed to appear:
 *  - the token layer, which defines it
 *  - the single component that consumes it
 *  - this test
 */
const ALLOWED = [
  'src/design-system/tokens.css',
  'src/components/DangerAction.css',
  'src/components/DangerAction.tsx',
  'src/design-system/danger.guard.test.ts',
  // Verifies the token's contrast, so it necessarily names it.
  'src/design-system/contrast.test.ts',
];

/** Empty: the سَكينة stylesheet has been removed along with its view layer. */
const LEGACY: string[] = [];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx|css)$/.test(entry)) yield full;
  }
}

describe('danger colour isolation', () => {
  /**
   * Spec §15.1: red means a user-reported immediate danger and nothing else.
   * An activation of 8/10 must never be styled as an emergency. Conventions
   * decay under deadline pressure, so this is enforced rather than documented.
   */
  it('is referenced only by the token definition and the one component that uses it', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const relativePath = relative(ROOT, file);
      if (ALLOWED.includes(relativePath) || LEGACY.includes(relativePath)) continue;
      const contents = readFileSync(file, 'utf8');
      if (/--danger\b/.test(contents)) offenders.push(relativePath);
    }

    expect(
      offenders,
      `Only DangerAction may use --danger. Move the styling there instead of adding:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('has no hard-coded red hex values outside the token layer', () => {
    const reds = /#(?:b3404[0-9a-f]|e0858[0-9a-f]|f00|ff0000|dc2626|ef4444|e53e3e)\b/i;
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const relativePath = relative(ROOT, file);
      if (ALLOWED.includes(relativePath) || LEGACY.includes(relativePath)) continue;
      if (reds.test(readFileSync(file, 'utf8'))) offenders.push(relativePath);
    }

    expect(offenders, `Use the --danger token via DangerAction:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps its allowlist honest', () => {
    for (const path of ALLOWED) {
      expect(() => statSync(join(ROOT, path)), `${path} is listed but missing`).not.toThrow();
    }
  });

  /** Forces the legacy exception to be removed once the file it covers is gone. */
  it('has no stale legacy exceptions', () => {
    for (const path of LEGACY) {
      expect(
        () => statSync(join(ROOT, path)),
        `${path} no longer exists: remove it from LEGACY`,
      ).not.toThrow();
    }
  });
});
