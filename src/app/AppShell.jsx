import { matchPath, Navigate, Outlet, useLocation } from 'react-router';
import AppFrame from '@shared/components/layout/AppFrame.jsx';
import LoadingScreen from '@shared/components/feedback/LoadingScreen.jsx';
import StatusBar from '@features/editor/StatusBar.jsx';
import ServiceDownScreen from '@features/setup/ServiceDownScreen.jsx';
import SetupScreen from '@features/setup/SetupScreen.jsx';
import { useSystemStatus } from '@features/setup/systemStatus.js';
import { ROUTES } from '@app/router/routes.js';

// The first-run screen the installed app must show before Home, or null when there is none. The system status
// decides, in this order (Build Plan 20c; there is no pairing):
//   server down -> Service down
//   a tool missing -> Setup; /setup stays on Setup until its Continue
function firstRunScreen(pathname, { data: status, isPending, isError }) {
  // StartupGate has usually filled the status already; this shows only when it could not wait long enough.
  if (isPending) return <LoadingScreen page />;
  if (isError) return <ServiceDownScreen />;
  if (!status.ready && pathname !== ROUTES.setup) return <Navigate to={ROUTES.setup} replace />;
  if (pathname === ROUTES.setup) return <SetupScreen status={status} />;
  return null;
}

// Every screen of the installed app sits inside this. The first-run screens fill the window on their own; Home and the
// editor have the status bar under them.
export default function AppShell() {
  const { pathname } = useLocation();
  const statusQuery = useSystemStatus();
  const firstRun = firstRunScreen(pathname, statusQuery);

  if (firstRun) return <AppFrame>{firstRun}</AppFrame>;

  // The right side of the status bar (guide 8.9).
  let hint;
  if (pathname === ROUTES.projects) hint = 'Drop a file anywhere to start';
  if (matchPath(ROUTES.project, pathname)) {
    hint = 'Click a word to seek · drag to select · Delete to remove · ⌘-scroll the timeline to zoom';
  }

  return (
    <AppFrame footer={<StatusBar hint={hint} />}>
      <Outlet />
    </AppFrame>
  );
}
