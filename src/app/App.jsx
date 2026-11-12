import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import ToastProvider from '@shared/components/ui/ToastProvider.jsx';
import AppShell from '@app/AppShell.jsx';
import UpdatePrompt from '@app/update/UpdatePrompt.jsx';
import { ROUTES } from '@app/router/routes.js';

// Dev only: Vite replaces import.meta.env.DEV with false in a build, so the gallery is left out entirely.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('@app/dev/gallery/ComponentGallery.jsx')) : null;

const routes = [
  ...(ComponentGallery
    ? [{ path: ROUTES.gallery, element: <Suspense fallback={null}><ComponentGallery /></Suspense> }]
    : []),
  {
    element: <AppShell />,
    children: [
      // AppShell renders Pair and Setup itself (it decides when they show); these entries make the paths valid.
      { path: ROUTES.pair, element: null },
      { path: ROUTES.setup, element: null },
      // Projects arrives in Step 9, the editor after it.
      { path: '*', element: null },
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
