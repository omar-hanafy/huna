import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId } from './id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createId', () => {
  it('uses crypto.randomUUID when it is available', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111');
    // randomUUID is preferred, so no getRandomValues is needed on this stub.
    vi.stubGlobal('crypto', { randomUUID });
    expect(createId()).toBe('11111111-1111-4111-8111-111111111111');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  /**
   * Defect 5: this is the path taken when the app is opened over plain http
   * from a phone on the LAN, where randomUUID does not exist.
   */
  it('falls back to getRandomValues and still produces a valid v4 uuid', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        for (let index = 0; index < array.length; index += 1) array[index] = index * 7 + 3;
        return array;
      },
    });

    const id = createId();
    expect(id).toMatch(UUID_PATTERN);
  });

  it('produces distinct ids from the getRandomValues fallback', () => {
    let seed = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        for (let index = 0; index < array.length; index += 1) {
          seed += 1;
          array[index] = seed % 256;
        }
        return array;
      },
    });

    expect(createId()).not.toBe(createId());
  });

  it('still returns an id when there is no crypto object at all', () => {
    vi.stubGlobal('crypto', undefined);
    const id = createId();
    expect(id).toMatch(/^id-/);
    expect(id.length).toBeGreaterThan(8);
  });

  it('generates unique ids across many calls in the normal path', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId()));
    expect(ids.size).toBe(500);
  });
});
