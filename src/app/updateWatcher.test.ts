import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pwaStub } from '../test/pwaRegisterStub';
import {
  acceptUpdate,
  dismissUpdate,
  resetUpdateWatcherForTests,
  startUpdateWatcher,
  subscribeToUpdates,
} from './updateWatcher';

const reload = vi.fn();
const realLocation = window.location;

beforeEach(() => {
  pwaStub.reset();
  resetUpdateWatcherForTests();
  reload.mockClear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('updateWatcher', () => {
  it('registers the service worker exactly once however many screens ask', () => {
    startUpdateWatcher();
    startUpdateWatcher();
    expect(pwaStub.registered).toBe(1);
  });

  it('reports the current state to a new subscriber and to later ones', () => {
    startUpdateWatcher();
    const seen: boolean[] = [];
    const unsubscribe = subscribeToUpdates((needRefresh) => seen.push(needRefresh));
    expect(seen).toEqual([false]);

    pwaStub.options?.onNeedRefresh?.();
    expect(seen).toEqual([false, true]);

    const late: boolean[] = [];
    subscribeToUpdates((needRefresh) => late.push(needRefresh));
    expect(late).toEqual([true]);

    unsubscribe();
    dismissUpdate();
    expect(seen).toEqual([false, true]);
    expect(late).toEqual([true, false]);
  });

  /**
   * The heart of it: workbox fires `controlling` in every open tab once the
   * waiting worker takes over. Only the tab whose user pressed "update now"
   * may reload; any other tab could be mid-episode.
   */
  it('does not reload a tab that never accepted the update', () => {
    startUpdateWatcher();
    pwaStub.options?.onNeedReload?.();
    expect(reload).not.toHaveBeenCalled();
  });

  /**
   * Once another tab has taken the update, the waiting worker is gone and this
   * tab's "update now" would do nothing at all. An offer that cannot be
   * accepted has to be withdrawn rather than left sitting there.
   */
  it('withdraws the offer in a tab where another tab applied the update', () => {
    startUpdateWatcher();
    const seen: boolean[] = [];
    subscribeToUpdates((needRefresh) => seen.push(needRefresh));

    pwaStub.options?.onNeedRefresh?.();
    pwaStub.options?.onNeedReload?.();

    expect(seen).toEqual([false, true, false]);
    expect(reload).not.toHaveBeenCalled();
  });

  /** "Not now" after "update now" must disarm the reload, not merely hide it. */
  it('lets the user take back an accepted update', () => {
    startUpdateWatcher();
    acceptUpdate();
    dismissUpdate();

    pwaStub.options?.onNeedReload?.();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads the tab that accepted the update', () => {
    startUpdateWatcher();
    acceptUpdate();
    expect(pwaStub.updates).toEqual([true]);

    pwaStub.options?.onNeedReload?.();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('survives an accept before registration completed', () => {
    acceptUpdate();
    expect(pwaStub.updates).toEqual([]);
  });
});
