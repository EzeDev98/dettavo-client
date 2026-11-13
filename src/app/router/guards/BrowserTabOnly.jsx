import { Navigate } from 'react-router';
import { isRunningAsApp } from '@core/pwa/isPWAInstalled.js';

// Wraps Onboarding and Install. The installed app never shows them: it goes straight on to redirectTo.
export default function BrowserTabOnly({ redirectTo, children }) {
  if (isRunningAsApp()) return <Navigate to={redirectTo} replace />;
  return children;
}
