/**
 * Stands in for `virtual:pwa-register`, which only exists inside a Vite build.
 * Aliased in vitest.config.ts so the update watcher and its banner can be
 * exercised in tests rather than sitting permanently uncovered.
 */
export interface RegisterSWOptions {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onNeedReload?: () => void;
  onOfflineReady?: () => void;
  onRegisterError?: (error: unknown) => void;
}

/**
 * Records what the app asked for. Tests read `options` to fire the callbacks a
 * real service-worker lifecycle would fire, and `updates` to assert that
 * accepting an update actually asked the worker to take over.
 */
export const pwaStub = {
  registered: 0,
  options: null as RegisterSWOptions | null,
  updates: [] as (boolean | undefined)[],
  reset(): void {
    pwaStub.registered = 0;
    pwaStub.options = null;
    pwaStub.updates = [];
  },
};

export function registerSW(options: RegisterSWOptions = {}): (reloadPage?: boolean) => Promise<void> {
  pwaStub.registered += 1;
  pwaStub.options = options;
  return (reloadPage?: boolean) => {
    pwaStub.updates.push(reloadPage);
    return Promise.resolve();
  };
}
