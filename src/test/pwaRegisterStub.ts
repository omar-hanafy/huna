/**
 * Stands in for `virtual:pwa-register/react`, which only exists inside a Vite
 * build. Aliased in vitest.config.ts so UpdateNotice can be rendered in tests
 * rather than sitting permanently uncovered.
 */
import { useState } from 'react';

export interface RegisterSWState {
  needRefresh: [boolean, (value: boolean) => void];
  offlineReady: [boolean, (value: boolean) => void];
  updateServiceWorker: (reload?: boolean) => Promise<void>;
}

/** Tests set this before rendering to choose what the hook reports. */
export const pwaStub = {
  needRefresh: false,
  updateServiceWorker: (_reload?: boolean): Promise<void> => Promise.resolve(),
};

export function useRegisterSW(): RegisterSWState {
  const [needRefresh, setNeedRefresh] = useState(pwaStub.needRefresh);
  const [offlineReady, setOfflineReady] = useState(false);
  return {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker: pwaStub.updateServiceWorker,
  };
}
