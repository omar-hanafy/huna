import { registerSW } from 'virtual:pwa-register';

/**
 * One service-worker registration for the whole app, started at boot.
 *
 * Registration used to live inside the AppShell update banner, so a user who
 * stayed on onboarding or entered directly at #/alert never registered the
 * worker and got no offline support at all.
 *
 * The reload decision is also owned here: workbox fires `controlling` in every
 * open tab once a waiting worker takes over, and the library's default is to
 * reload each of them. Only the tab whose user pressed "update now" should
 * reload; the others keep the old shell until their next natural start, which
 * is the app's stated promise that an update never reloads anyone mid-session.
 */

type Listener = (needRefresh: boolean) => void;

const listeners = new Set<Listener>();
let needRefresh = false;
let accepted = false;
let updateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let started = false;

function notify(): void {
  listeners.forEach((listener) => listener(needRefresh));
}

export function startUpdateWatcher(): void {
  if (started) return;
  started = true;
  updateFn = registerSW({
    onNeedRefresh() {
      needRefresh = true;
      notify();
    },
    onNeedReload() {
      if (accepted) {
        window.location.reload();
        return;
      }
      // Another tab accepted the update, so this tab's offer is now a button
      // that would do nothing. Take it away; the new version arrives here at
      // the next natural start.
      needRefresh = false;
      notify();
    },
  });
}

export function subscribeToUpdates(listener: Listener): () => void {
  listeners.add(listener);
  listener(needRefresh);
  return () => {
    listeners.delete(listener);
  };
}

export function acceptUpdate(): void {
  accepted = true;
  void updateFn?.(true);
}

export function dismissUpdate(): void {
  needRefresh = false;
  // Also withdraws consent: pressing "update now" and then "not now" must not
  // leave a reload armed to fire whenever the worker happens to take over.
  accepted = false;
  notify();
}

/** Test-only: returns the watcher to its pristine state. */
export function resetUpdateWatcherForTests(): void {
  listeners.clear();
  needRefresh = false;
  accepted = false;
  updateFn = null;
  started = false;
}
