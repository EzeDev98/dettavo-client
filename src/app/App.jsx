import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import ToastProvider from '@shared/components/ui/ToastProvider.jsx';
import AppShell from '@app/AppShell.jsx';
import UpdatePrompt from '@app/update/UpdatePrompt.jsx';
import { ROUTES } from '@app/router/routes.js';
import HomeScreen from '@features/projects/HomeScreen.jsx';
import EditorScreen from '@features/editor/EditorScreen.jsx';

// Dev only: Vite replaces import.meta.env.DEV with false in a build, so the gallery is left out entirely.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('@app/dev/gallery/ComponentGallery.jsx')) : null;
const ProjectEventsPage = import.meta.env.DEV ? lazy(() => import('@app/dev/events/ProjectEventsPage.jsx')) : null;

const routes = [
  ...(ComponentGallery
    ? [{ path: ROUTES.gallery, element: <Suspense fallback={null}><ComponentGallery /></Suspense> }]
    : []),
  ...(ProjectEventsPage
    ? [{ path: ROUTES.projectEvents, element: <Suspense fallback={null}><ProjectEventsPage /></Suspense> }]
    : []),
  {
    element: <AppShell />,
    children: [
      // AppShell renders Pair and Setup itself (it decides when they show); these entries make the paths valid.
      { path: ROUTES.pair, element: null },
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
