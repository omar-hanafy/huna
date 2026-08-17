import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The spec quotes specific contrast ratios for the palette. Quoted numbers rot,
 * so they are recomputed here from the token file itself: changing a colour
 * without checking it fails the build rather than shipping unreadable text.
 */

const TOKENS = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8');

/** Pulls the token values from one block of the file. */
function paletteFrom(startMarker: string): Record<string, string> {
  const start = TOKENS.indexOf(startMarker);
  expect(start, `Missing block: ${startMarker}`).toBeGreaterThan(-1);
  const block = TOKENS.slice(start, TOKENS.indexOf('}', start));

  const palette: Record<string, string> = {};
  for (const match of block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    palette[match[1]!] = match[2]!;
  }
  return palette;
}

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/** WCAG AA for body text. */
const AA_TEXT = 4.5;
/** WCAG AA for large text and for non-text boundaries. */
const AA_LARGE = 3;

const THEMES = [
  { name: 'light', marker: ':root {' },
  { name: 'dark (OS preference)', marker: ":root:not([data-theme='light']) {" },
  { name: 'dark (explicit override)', marker: ":root[data-theme='dark'] {" },
] as const;

describe.each(THEMES)('palette contrast, $name', ({ marker }) => {
  const palette = paletteFrom(marker);

  it('defines every colour the theme needs', () => {
    for (const token of ['--bg', '--text', '--text-muted', '--primary', '--danger', '--border']) {
      expect(palette[token], `${token} is missing`).toBeDefined();
    }
  });

  it('keeps body text at AA on the page background', () => {
    expect(contrast(palette['--text']!, palette['--bg']!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps muted text at AA on the page background', () => {
    expect(contrast(palette['--text-muted']!, palette['--bg']!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps the primary colour at AA on the page background', () => {
    expect(contrast(palette['--primary']!, palette['--bg']!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  /** Someone reads this while frightened. It cannot be the hardest thing to read. */
  it('keeps the danger colour at AA on the page background', () => {
    expect(contrast(palette['--danger']!, palette['--bg']!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps primary-on-primary and danger-on-danger legible', () => {
    expect(contrast(palette['--primary-contrast']!, palette['--primary']!)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(palette['--danger-contrast']!, palette['--danger']!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps body text at AA on every surface, not only the page background', () => {
    for (const surface of ['--surface-1', '--surface-calm', '--surface-warm', '--surface-sunken']) {
      const value = palette[surface];
      if (!value) continue;
      expect(contrast(palette['--text']!, value), `--text on ${surface}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('keeps borders visible enough to read as boundaries', () => {
    expect(contrast(palette['--border-strong']!, palette['--bg']!)).toBeGreaterThanOrEqual(1.5);
  });

  it('keeps the focus ring distinguishable from the background', () => {
    expect(contrast(palette['--focus-ring']!, palette['--bg']!)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  /**
   * Accents are fills only. This records that fact rather than pretending they
   * pass as text: anything drawn on them uses --text, which is checked above.
   */
  it('carries dark text legibly on every accent fill', () => {
    for (const accent of ['--accent-sage', '--accent-blue', '--accent-sand', '--accent-amber']) {
      const value = palette[accent];
      if (!value) continue;
      const best = Math.max(contrast(palette['--text']!, value), contrast(palette['--text-inverse']!, value));
      expect(best, `text on ${accent}`).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe('theme completeness', () => {
  it('overrides the same tokens in both dark blocks, so the toggle matches the OS', () => {
    const os = Object.keys(paletteFrom(":root:not([data-theme='light']) {")).sort();
    const explicit = Object.keys(paletteFrom(":root[data-theme='dark'] {")).sort();
    expect(explicit).toEqual(os);
  });

  it('defines every dark override in the light baseline too', () => {
    const light = Object.keys(paletteFrom(':root {'));
    for (const token of Object.keys(paletteFrom(":root[data-theme='dark'] {"))) {
      expect(light, `${token} has no light value`).toContain(token);
    }
  });
});
