import { Navigate, Outlet, useLocation } from 'react-router';
import Spinner from '@shared/components/ui/Spinner.jsx';
import AppFrame from '@shared/components/layout/AppFrame.jsx';
import StatusBar from '@features/editor/StatusBar.jsx';
import ServiceDownScreen from '@features/setup/ServiceDownScreen.jsx';
import PairScreen from '@features/setup/PairScreen.jsx';
import SetupScreen from '@features/setup/SetupScreen.jsx';
import { useSystemStatus } from '@features/setup/systemStatus.js';
import { ROUTES } from '@app/router/routes.js';
import './AppShell.css';

// Every screen sits inside this. The system status decides what shows, in this order (guide 9):
// server down -> Service-down; on /pair -> pairing; not paired -> Not paired; tools missing -> /setup.
function Gate() {
  const { pathname } = useLocation();
  const { data: status, isPending, isError, refetch, isFetching } = useSystemStatus();

  if (isPending) {
    return (
      <div className="app-shell__loading">
        <Spinner label="Connecting to the local service" />
      </div>
    );
  }
  if (isError) return <ServiceDownScreen onRetry={() => refetch()} retrying={isFetching} />;
  if (pathname === ROUTES.pair) return <PairScreen paired={status.paired} />;
  if (!status.paired) return <PairScreen />;
  if (pathname === ROUTES.setup) return <SetupScreen status={status} />;
  if (!status.ready) return <Navigate to={ROUTES.setup} replace />;
  return <Outlet />;
}

export default function AppShell() {
  const { pathname } = useLocation();
  const { data: status } = useSystemStatus();
  // Home's hint (prototype 5a), once Home is what shows.
  const hint = pathname === ROUTES.projects && status?.paired && status?.ready ? 'Drop a file anywhere to start' : undefined;

  return (
    <AppFrame footer={<StatusBar hint={hint} />}>
      <Gate />
    </AppFrame>
  );
}
