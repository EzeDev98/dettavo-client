import { Navigate } from 'react-router';
import { env } from '@core/config/env.js';
import { isRunningAsApp } from '@core/pwa/isPWAInstalled.js';

export default function InstallGuard({ redirectTo, children }) {
  if (env.skipInstallGuard || isRunningAsApp()) return children;
  return <Navigate to={redirectTo} replace />;
}
