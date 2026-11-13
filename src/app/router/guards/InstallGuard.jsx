import { Navigate } from 'react-router';
import { env } from '@core/config/env.js';
import { isRunningAsApp } from '@core/pwa/isPWAInstalled.js';

// Wraps the routes that need the installed app, from Ahorra. Only the installed app's own window gets in: a browser
// tab goes to the Install screen, even where the app is installed, and there sees the hand-off to the Dock.
// redirectTo: the Install path. Onboarding and Install are simply not wrapped.
export default function InstallGuard({ redirectTo, children }) {
  if (env.skipInstallGuard || isRunningAsApp()) return children;
  return <Navigate to={redirectTo} replace />;
}
