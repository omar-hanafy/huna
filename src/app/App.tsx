import { useEffect } from 'react';
import { Navigate, Route, HashRouter as Router, Routes, useLocation } from 'react-router';
import { AlertRoute } from '../features/alert/AlertRoute';
import { CheckOnce } from '../routes/CheckOnce';
import { CopingCardRoute } from '../routes/CopingCardRoute';
import { Home } from '../routes/Home';
import { Journal } from '../routes/Journal';
import { Ladder } from '../routes/Ladder';
import { Onboarding } from '../routes/Onboarding';
import { Program } from '../routes/Program';
import { Progress } from '../routes/Progress';
import { SettingsRoute } from '../routes/SettingsRoute';
import { Today } from '../routes/Today';
import { Tools } from '../routes/Tools';
import { AppShell } from './AppShell';
import { DocumentChrome } from './DocumentChrome';
import { OnboardingGate } from './OnboardingGate';
import { UpdateNotice } from './UpdateNotice';

/**
 * Every route change starts at the top of the page.
 *
 * Without this, a hash-router navigation keeps the previous screen's scroll
 * position, so an alert step could open with its single instruction scrolled
 * out of view - precisely when the user is least equipped to hunt for it.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Hash routing, deliberately.
 *
 * The app is served from a project sub-path on GitHub Pages, which has no
 * rewrite rules. Hash routes need no 404.html trick and survive the base path
 * unchanged.
 *
 * Every alert sub-step is a real route so the back button behaves and
 * `#/alert` can be the target of an iOS Shortcut bound to Back Tap.
 */
export function App() {
  return (
    <Router>
      <ScrollToTop />
      <DocumentChrome />
      {/* Mounted above the routes so the service worker registers on every
          entry point, including onboarding and a cold #/alert start. */}
      <UpdateNotice />
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<OnboardingGate />}>
          <Route path="/alert/*" element={<AlertRoute />} />
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="/today" element={<Today />} />
            <Route path="/program" element={<Program />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/card" element={<CopingCardRoute />} />
            <Route path="/check" element={<CheckOnce />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/ladder" element={<Ladder />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/settings" element={<SettingsRoute />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
