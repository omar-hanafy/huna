import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const SCANNED_DIRS = ['src', 'docs', 'e2e'];
const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.css', '.json', '.md', '.html'];
const IGNORED = new Set(['node_modules', 'dist', 'coverage', 'playwright-report', 'test-results']);

// Built from its code point so that this file does not itself contain the
// character it is searching for.
const EM_DASH = String.fromCharCode(0x2014);

/**
 * Files still permitted to touch localStorage directly. Every entry is legacy
 * awaiting replacement by the AppStorage layer. The second assertion below
 * fails once an entry no longer exists, so this list cannot rot.
 */
const LEGACY_LOCAL_STORAGE_FILES = ['src/hooks/usePersistentState.ts'];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (SCANNED_EXTENSIONS.some((extension) => entry.endsWith(extension))) {
      yield full;
    }
  }
}

function scannedFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCANNED_DIRS) {
    const full = join(ROOT, dir);
    if (existsSync(full) && statSync(full).isDirectory()) files.push(...walk(full));
  }
  return files;
}

describe('project conventions', () => {
  it('contains no em-dash characters anywhere, including comments and markdown', () => {
    const offenders: string[] = [];
    for (const file of scannedFiles()) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (line.includes(EM_DASH)) offenders.push(`${relative(ROOT, file)}:${index + 1}`);
        });
    }
    expect(offenders, `Use - or _ instead. Offending lines:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('never reaches for localStorage outside the storage layer', () => {
    const offenders: string[] = [];
    for (const file of scannedFiles()) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
      const relativePath = relative(ROOT, file);
      if (relativePath.startsWith('src/storage/')) continue;
      if (relativePath.startsWith('src/test/')) continue;
      if (LEGACY_LOCAL_STORAGE_FILES.includes(relativePath)) continue;
      if (/\blocalStorage\b/.test(readFileSync(file, 'utf8'))) offenders.push(relativePath);
    }
    expect(
      offenders,
      `Persistence must go through AppStorage. Offending files:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('has no stale entries in the legacy localStorage allowlist', () => {
    const stale = LEGACY_LOCAL_STORAGE_FILES.filter((path) => !existsSync(join(ROOT, path)));
    expect(stale, `Remove these from LEGACY_LOCAL_STORAGE_FILES:\n${stale.join('\n')}`).toEqual([]);
  });
});
