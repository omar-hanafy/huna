import { useEffect } from 'react';
import { applyDocumentLocale } from '../i18n';
import type { UserPreferences } from '../storage/types';

/**
 * Projects preferences onto the document element, where the CSS token layer
 * reads them.
 *
 * Kept in one place so there is a single answer to "what decides the theme",
 * and so `prefers-reduced-motion` from the OS and the in-app toggle cannot
 * disagree about which wins: the toggle only ever adds the attribute, never
 * removes the media query.
 */
export function useDocumentChrome(preferences: UserPreferences | undefined): void {
  useEffect(() => {
    if (!preferences) return;
    const root = document.documentElement;

    applyDocumentLocale(preferences.locale);

    if (preferences.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', preferences.theme);

    if (preferences.reducedMotion) root.setAttribute('data-reduced-motion', 'true');
    else root.removeAttribute('data-reduced-motion');

    if (preferences.discreetMode) root.setAttribute('data-discreet', 'true');
    else root.removeAttribute('data-discreet');
  }, [preferences]);
}

/** Reads the OS reduced-motion preference, for pre-filling the onboarding toggle. */
export function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
