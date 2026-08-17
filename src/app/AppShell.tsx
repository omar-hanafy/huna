import { BookOpen, CalendarDays, Home as HomeIcon, Settings, Wind } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { useDocumentChrome } from '../design-system/useDocumentChrome';
import { usePreferences } from '../storage/hooks';
import { useStorageContext } from '../storage/useStorage';
import { UpdateNotice } from './UpdateNotice';
import './AppShell.css';

const ITEMS = [
  { to: '/', key: 'home', Icon: HomeIcon, end: true },
  { to: '/today', key: 'today', Icon: BookOpen, end: false },
  { to: '/program', key: 'program', Icon: CalendarDays, end: false },
  { to: '/tools', key: 'tools', Icon: Wind, end: false },
  { to: '/settings', key: 'settings', Icon: Settings, end: false },
] as const;

/**
 * The persistent chrome.
 *
 * A tab bar rather than a drawer: no overlay to trap focus in, no Escape
 * handling to get wrong, and every destination reachable with one thumb. The
 * previous drawer had neither a focus trap nor Escape-to-close (defect 17), and
 * removing it is a better answer than adding both.
 *
 * Progress is not here. It appears in settings only once the user asks for it.
 */
export function AppShell() {
  const { t } = useTranslation();
  const preferences = usePreferences();
  const { problem } = useStorageContext();

  useDocumentChrome(preferences);

  return (
    <div className="app-shell">
      {problem ? (
        <div className="storage-banner" role="alert">
          {problem === 'quota' ? t('settings.storageFull') : t('settings.storageUnavailable')}
        </div>
      ) : null}

      <UpdateNotice />

      <main className="app-shell__main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label={t('nav.home')}>
        {ITEMS.map(({ to, key, Icon, end }) => (
          <NavLink
            key={key}
            to={to}
            end={end}
            className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}
          >
            {/* Icons always travel with their label: meaning never rests on a glyph alone. */}
            <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
            <span>{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
