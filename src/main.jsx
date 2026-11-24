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
import App from '@app/App.jsx';

registerServiceWorker();
appUpdate.start();

if (import.meta.env.DEV) import('@app/dev/edit/editConsole.js');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
