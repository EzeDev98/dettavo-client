// First import: catches Chrome's install prompt, which fires once, early (Build Plan 20b).
import '@core/pwa/installPrompt.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import '@/styles/tokens.css';
import '@/styles/reset.css';
import '@/styles/fonts.css';
import '@/styles/base.css';
import { queryClient } from '@core/data/queryClient.js';
import { registerServiceWorker } from '@core/pwa/registerServiceWorker.js';
import { appUpdate } from '@core/pwa/appUpdate.js';
import { detectInstalledApp } from '@core/pwa/isPWAInstalled.js';
import App from '@app/App.jsx';

registerServiceWorker();
detectInstalledApp();
appUpdate.start();

// Dev only: window.dettavoEdit, the edit engine in the console (Build Plan 12). Left out of a build entirely.
if (import.meta.env.DEV) import('@app/dev/edit/editConsole.js');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
