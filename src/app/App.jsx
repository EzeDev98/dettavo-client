import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import AppFrame from '@shared/components/layout/AppFrame.jsx';
import ToastProvider from '@shared/components/ui/ToastProvider.jsx';
import AppShell from '@app/AppShell.jsx';
import UpdatePrompt from '@app/update/UpdatePrompt.jsx';
import { ROUTES } from '@app/router/routes.js';
import BrowserTabOnly from '@app/router/guards/BrowserTabOnly.jsx';
import InstallGuard from '@app/router/guards/InstallGuard.jsx';
import OnboardingScreen from '@features/install/OnboardingScreen.jsx';
import InstallScreen from '@features/install/InstallScreen.jsx';
import HomeScreen from '@features/projects/HomeScreen.jsx';
import EditorScreen from '@features/editor/EditorScreen.jsx';

// Dev only: Vite replaces import.meta.env.DEV with false in a build, so the gallery is left out entirely.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('@app/dev/gallery/ComponentGallery.jsx')) : null;
const ProjectEventsPage = import.meta.env.DEV ? lazy(() => import('@app/dev/events/ProjectEventsPage.jsx')) : null;

// Onboarding and Install, in a browser tab only. They need no local service, so they sit outside AppShell.
function FirstRunFrame() {
  return (
    <BrowserTabOnly redirectTo={ROUTES.projects}>
      <AppFrame>
        <Outlet />
      </AppFrame>
    </BrowserTabOnly>
  );
}

const routes = [
  ...(ComponentGallery
    ? [{ path: ROUTES.gallery, element: <Suspense fallback={null}><ComponentGallery /></Suspense> }]
    : []),
  ...(ProjectEventsPage
    ? [{ path: ROUTES.projectEvents, element: <Suspense fallback={null}><ProjectEventsPage /></Suspense> }]
    : []),
  {
    element: <FirstRunFrame />,
    children: [
      { path: ROUTES.welcome, element: <OnboardingScreen /> },
      { path: ROUTES.install, element: <InstallScreen /> },
    ],
  },
  {
    // Everything else is the installed app. A browser tab is sent to Onboarding.
    element: (
      <InstallGuard redirectTo={ROUTES.welcome}>
        <AppShell />
      </InstallGuard>
    ),
    children: [
      // AppShell renders Setup itself (it decides when it shows); this entry makes the path valid.
      { path: ROUTES.setup, element: null },
      { path: ROUTES.projects, element: <HomeScreen /> },
      { path: ROUTES.project, element: <EditorScreen /> },
      // A path the app does not know goes Home.
      { path: '*', element: <Navigate to={ROUTES.projects} replace /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </ToastProvider>
  );
}
