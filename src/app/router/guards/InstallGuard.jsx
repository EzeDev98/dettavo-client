import { Navigate } from 'react-router';
import { env } from '@core/config/env.js';
import { isRunningAsApp } from '@core/pwa/isPWAInstalled.js';

// Wraps the routes that need the installed app, from Ahorra. In a browser tab it sends the person to the first run
// instead. redirectTo: where a browser tab goes.
export default function InstallGuard({ redirectTo, children }) {
  if (env.skipInstallGuard || isRunningAsApp()) return children;
  return <Navigate to={redirectTo} replace />;
}
