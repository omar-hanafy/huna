import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Node 26 exposes its own experimental `localStorage` global, which shadows the
 * one jsdom provides and is unavailable unless the process was started with
 * `--localstorage-file`. Installing a plain in-memory Storage keeps tests
 * deterministic and independent of that flag. Browsers are unaffected.
 */
class MemoryStorage implements Storage {
  private entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

function installStorage(name: 'localStorage' | 'sessionStorage'): void {
  Object.defineProperty(window, name, {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

installStorage('localStorage');
installStorage('sessionStorage');

// jsdom does not implement matchMedia. Several components read
// prefers-reduced-motion and prefers-color-scheme, so provide a controllable
// stub that defaults to "no preference".
const mediaListeners = new Set<() => void>();

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
      addListener: (listener: () => void) => mediaListeners.add(listener),
      removeListener: (listener: () => void) => mediaListeners.delete(listener),
      dispatchEvent: () => false,
    })),
  );
});

afterEach(() => {
  cleanup();
  mediaListeners.clear();
  window.localStorage.clear();
});
