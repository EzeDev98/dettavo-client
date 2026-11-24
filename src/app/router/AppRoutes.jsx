import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router';
import AppFrame from '@shared/components/layout/AppFrame.jsx';
import AppShell from '@app/AppShell.jsx';
import InstallGuard from './guards/InstallGuard.jsx';
import { ROUTES } from './routes.js';
import OnboardingScreen from '@features/install/OnboardingScreen.jsx';
import InstallScreen from '@features/install/InstallScreen.jsx';
import HomeScreen from '@features/projects/HomeScreen.jsx';
import EditorScreen from '@features/editor/EditorScreen.jsx';

// Dev only: Vite replaces import.meta.env.DEV with false in a build, so these are left out entirely.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('@app/dev/gallery/ComponentGallery.jsx')) : null;
const ProjectEventsPage = import.meta.env.DEV ? lazy(() => import('@app/dev/events/ProjectEventsPage.jsx')) : null;

// Onboarding and Install. They need no local service, so they sit outside AppShell.
function FirstRunFrame() {
  return (
    <AppFrame>
      <Outlet />
    </AppFrame>
  );
}

// location: the location to show. AnimatedRoutes passes it, so the old screen can stay up while a transition plays.
export default function AppRoutes({ location }) {
  return (
    <Routes location={location}>
      {ComponentGallery && (
        <Route path={ROUTES.gallery} element={<Suspense fallback={null}><ComponentGallery /></Suspense>} />
      )}
      {ProjectEventsPage && (
        <Route path={ROUTES.projectEvents} element={<Suspense fallback={null}><ProjectEventsPage /></Suspense>} />
      )}

      {/* Reachable from a browser tab. Onboarding moves an installed app on; Install moves the app's own window on. */}
      <Route element={<FirstRunFrame />}>
        <Route path={ROUTES.onboarding} element={<OnboardingScreen />} />
        <Route path={ROUTES.install} element={<InstallScreen />} />
      </Route>

      {/* The installed app. Where it is not installed, InstallGuard sends the person to Install. */}
      <Route
        element={
          <InstallGuard redirectTo={ROUTES.install}>
            <AppShell />
          </InstallGuard>
        }
      >
        {/* AppShell renders Setup itself (it decides when it shows); this entry makes the path valid. */}
        <Route path={ROUTES.setup} element={null} />
        <Route path={ROUTES.projects} element={<HomeScreen />} />
        <Route path={ROUTES.project} element={<EditorScreen />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.onboarding} replace />} />
    </Routes>
  );
}
